import {
  DRAWER_CLOSED,
  currentScootchDay,
  fadeDrawer,
  isoFromInstant,
  morningOffer,
  returningItem,
  todayState,
  type ClockTime,
} from '@scootch/domain';

import { defaultSettings } from '../data/repositories/settings';
import type { EffectSwitches, ScreenSink } from '../effects/adapters';

import { askReminder, crisisInWords, setSeriousAside } from './care-flow';
import { DEFAULT_USUAL_START, dayNotifications, usualStart } from './day-notifications';
import {
  PASSIVE_EVENTS,
  isPickEvent,
  type DayContext,
  type DayEvent,
  type DayMemory,
  type DayState,
  type DayStoreDeps,
} from './day-types';
import { applyPickEvent } from './pick-events';
import { drawerEvent, setBargainedSession } from './pick-flow';
import { applySession, resolveThought, restoreSession } from './session-flow';
import { closeSession, shortenSession, turnWorkingLine } from './session-moments';
import { applySurfaceAction, noticePickUp } from './surface-actions';
import { askAnother, beFunny, fetchPending, resolveTranscript, submitText } from './task-flow';

export interface DayStore {
  readonly getState: () => DayState;
  readonly subscribe: (listener: () => void) => () => void;
  /** Applies one event at the current time. Events run one after another, in the order sent. */
  /**
   * Resolves once the event is applied, and anything it left arriving (the second stage of a task
   * call) has been applied too. Events sent in the meantime do not wait for that.
   */
  readonly dispatch: (event: DayEvent) => Promise<void>;
  /** Rebuilds today from storage and the clock. The app calls it once, before the first screen. */
  readonly start: () => Promise<void>;
  /** Where the effects runner delivers lines, bursts, the treat and parked thoughts. */
  readonly screen: ScreenSink;
}

const NOT_READY: DayState = {
  ready: false,
  localDate: '1970-01-01',
  today: { kind: 'nothing_yet', startsLeft: 0 },
  morning: { kind: 'fresh_ask' },
  pick: { kind: 'none' },
  energyNeeded: false,
  session: null,
  monster: null,
  monsterPending: false,
  taskCall: 'idle',
  notice: null,
  modelDown: false,
  reminderAt: null,
  heardDeadlines: [],
  line: null,
  burst: null,
  treat: null,
  parkedThoughts: [],
  drawer: { open: false, items: [] },
  settings: defaultSettings('en'),
};

/** The switches the runner obeys. The system's Reduce Motion always wins over the app's own. */
export function effectSwitches(state: DayState, systemReducedMotion: boolean): EffectSwitches {
  return {
    effects: state.settings.effects,
    haptics: state.settings.haptics,
    reducedMotion: systemReducedMotion || state.settings.motion === 'calm',
  };
}

/**
 * The one store behind the one screen. It holds today's state, runs every event through the
 * domain's reducers with the current time, writes the result through the repositories and hands
 * the effects to the runner. Storage is the truth: after each event today is read back from it.
 */
export function createDayStore(deps: DayStoreDeps): DayStore {
  const { repositories } = deps;
  const listeners = new Set<() => void>();
  const memory: DayMemory = {
    state: NOT_READY,
    offer: null,
    sessionRowId: null,
    lastOpenedDay: null,
    workingTurn: 0,
    restPending: false,
    turnedDown: [],
  };
  let usual: ClockTime = DEFAULT_USUAL_START;
  let queue: Promise<void> = Promise.resolve();
  let arriving: Promise<void> = Promise.resolve();

  const enqueue = (work: () => Promise<void>) => {
    const run = queue.then(work);
    queue = run.catch(() => undefined);
    return run;
  };
  const later: DayContext['later'] = (arrives, work) => {
    const applied = arrives.then((value) => enqueue(() => work(value))).catch(() => undefined);
    arriving = Promise.all([arriving, applied]).then(() => undefined);
  };
  /** Waits for everything that is arriving, including what arrives while waiting. */
  const settle = async () => {
    for (let seen: Promise<void> | null = null; seen !== arriving;) {
      seen = arriving;
      await seen;
    }
  };

  const set = (changes: Partial<DayState>) => {
    memory.state = { ...memory.state, ...changes };
    for (const listener of listeners) listener();
  };

  async function refresh(): Promise<void> {
    const { localDate, settings } = memory.state;
    const tasks = await repositories.tasks.where('localDate', localDate);
    const sessions = (
      await Promise.all(tasks.map((task) => repositories.sessions.where('taskId', task.id)))
    ).flat();
    const day = await repositories.days.get(localDate);
    const today = todayState({ localDate, day, tasks, sessions, plus: deps.plus() });
    const task = 'task' in today ? today.task : null;
    const monster = task
      ? ((await repositories.monsters.where('taskId', task.id))[0] ?? null)
      : null;
    const items = await repositories.drawerItems.all();
    // The reminder belongs to today's serious task while it is still only set, and to nothing else.
    const asked = await repositories.careReminder.read();
    const reminderAt =
      asked !== null &&
      today.kind === 'serious' &&
      today.session === null &&
      asked.taskId === task?.id
        ? asked.at
        : null;
    if (asked !== null && reminderAt === null) await repositories.careReminder.clear();
    set({
      today,
      reminderAt,
      // Asked once a day, before the first thing is picked.
      energyNeeded: (day?.energy ?? null) === null && tasks.length === 0,
      monster,
      monsterPending:
        task !== null && (task.screen === 'unscreened' || (task.screen === 'pass' && !monster)),
      morning: morningOffer({
        today: localDate,
        lastOpenedDay: memory.lastOpenedDay,
        tasks,
        returning: returningItem(items, localDate),
        drawer: items,
      }),
      drawer: { open: memory.state.drawer.open, items },
    });
    await deps.runner.syncNotifications(
      dayNotifications({
        today,
        settings,
        localDate,
        timeZone: deps.timeZone(),
        usualStart: usual,
        // Soft while something heavy is around: a serious task today, or one waiting in the drawer.
        heavyToday:
          tasks.some((one) => one.screen === 'serious') ||
          items.some((one) => one.screen === 'serious'),
        reminderAt,
      }),
    );
  }

  const ctx: DayContext = { deps, memory, set, refresh, later, now: () => deps.clock.now() };

  async function rebuild(): Promise<void> {
    const now = ctx.now();
    const timeZone = deps.timeZone();
    await repositories.transcripts.purgeOld(now);
    const settings = await repositories.settings.read(deps.phoneLanguage());

    const days = await repositories.days.all();
    const localDate = currentScootchDay({
      now,
      timeZone,
      latestDay: days.at(-1)?.localDate ?? null,
    });
    memory.lastOpenedDay = days.findLast((day) => day.localDate < localDate)?.localDate ?? null;
    if (!days.some((day) => day.localDate === localDate)) {
      await repositories.days.put({
        localDate,
        status: 'open',
        openedAt: isoFromInstant(now),
        morningLine: null,
        energy: null,
      });
    }

    // Undated things whose two weeks are up leave the drawer without a word.
    const { fadedIds } = fadeDrawer(await repositories.drawerItems.all(), localDate);
    for (const id of fadedIds) await repositories.drawerItems.remove(id);

    usual = usualStart(await repositories.sessions.all(), timeZone);
    memory.offer = null;
    memory.sessionRowId = null;
    memory.restPending = false;
    memory.turnedDown = [];
    set({ ...NOT_READY, settings, localDate, drawer: { ...DRAWER_CLOSED, items: [] } });
    await refresh();
    if (memory.state.today.kind !== 'crisis') {
      await restoreSession(ctx, await repositories.tasks.where('localDate', localDate));
    }
    set({ ready: true });
    await fetchPending(ctx);
  }

  async function handle(event: DayEvent): Promise<void> {
    // A crisis day takes no events but the app's own comings and goings; nothing overrides it.
    if (memory.state.today.kind === 'crisis' && !PASSIVE_EVENTS.includes(event.type)) return;
    if (await crisisInWords(ctx, event)) return;
    if (isPickEvent(event)) return applyPickEvent(ctx, event);
    switch (event.type) {
      case 'text_submitted':
        return submitText(ctx, { ...event, declined: [], transcriptId: null, candidates: [] });
      case 'another_asked':
        return askAnother(ctx);
      case 'session_set':
        await resolveTranscript(ctx);
        return setBargainedSession(ctx, event.minutes, event.treat ?? null);
      case 'session':
        return applySession(ctx, event.event);
      case 'drawer':
        return drawerEvent(ctx, event.event);
      case 'thought_resolved':
        return resolveThought(ctx, event.thought, event.resolution);
      case 'working_line_turned':
        return turnWorkingLine(ctx);
      case 'session_closed':
        return closeSession(ctx);
      case 'developer_session_ends_in':
        return shortenSession(ctx, event.seconds);
      case 'done_for_today': {
        const day = await repositories.days.get(memory.state.localDate);
        if (day && day.status === 'open') await repositories.days.put({ ...day, status: 'done' });
        return refresh();
      }
      case 'be_funny_asked':
        return beFunny(ctx);
      case 'serious_set_aside':
        await resolveTranscript(ctx);
        return setSeriousAside(ctx);
      case 'reminder_asked':
        return askReminder(ctx);
      case 'settings_changed':
        await repositories.settings.write(event.changes);
        set({ settings: await repositories.settings.read(deps.phoneLanguage()) });
        return refresh();
      case 'storage_replaced':
        return rebuild();
      case 'connection_returned':
        return fetchPending(ctx);
      case 'surface_action':
        return applySurfaceAction(ctx, event.action);
      case 'surface_request_taken':
        return set({ surfaceRequest: null });
      case 'opened_mid_session':
        return noticePickUp(ctx);
      case 'app_backgrounded':
        return applySession(ctx, { type: 'backgrounded' });
      case 'app_foregrounded': {
        const latestDay = memory.state.localDate;
        const today = currentScootchDay({ now: ctx.now(), timeZone: deps.timeZone(), latestDay });
        if (today !== latestDay) return rebuild();
        await applySession(ctx, { type: 'foregrounded' });
        deps.runner.resync();
        return fetchPending(ctx);
      }
    }
  }

  return {
    getState: () => memory.state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    dispatch: (event) => enqueue(() => handle(event)).then(settle),
    start: () => enqueue(rebuild).then(settle),
    screen: {
      showLine: (slot, text) => set({ line: { slot, text } }),
      showBurst: (burst) => set({ burst }),
      handOverTreat: (treat) => set({ treat }),
      showParkedThoughts: (thoughts) => set({ parkedThoughts: thoughts }),
    },
  };
}
