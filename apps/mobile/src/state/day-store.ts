import {
  DRAWER_CLOSED,
  currentScootchDay,
  drawerViewReducer,
  fadeDrawer,
  isoFromInstant,
  morningOffer,
  returningItem,
  todayState,
  type ClockTime,
} from '@scootch/domain';

import { defaultSettings } from '../data/repositories/settings';
import type { EffectSwitches, ScreenSink } from '../effects/adapters';

import { DEFAULT_USUAL_START, dayNotifications, usualStart } from './day-notifications';
import type { DayContext, DayEvent, DayMemory, DayState, DayStoreDeps } from './day-types';
import { applySession, resolveThought, restoreSession, setSession } from './session-flow';
import { closeSession, shortenSession, turnWorkingLine } from './session-moments';
import { askAnother, fetchPending, resolveTranscript, submitText } from './task-flow';

export interface DayStore {
  readonly getState: () => DayState;
  readonly subscribe: (listener: () => void) => () => void;
  /** Applies one event at the current time. Events run one after another, in the order sent. */
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
  session: null,
  monster: null,
  monsterPending: false,
  taskCall: 'idle',
  notice: null,
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
  };
  let usual: ClockTime = DEFAULT_USUAL_START;
  let queue: Promise<void> = Promise.resolve();

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
    set({
      today,
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
        lastOpenedDay: memory.lastOpenedDay,
        usualStart: usual,
      }),
    );
  }

  const ctx: DayContext = { deps, memory, set, refresh, now: () => deps.clock.now() };

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
    set({ ...NOT_READY, settings, localDate, drawer: { ...DRAWER_CLOSED, items: [] } });
    await refresh();
    if (memory.state.today.kind !== 'crisis') {
      await restoreSession(ctx, await repositories.tasks.where('localDate', localDate));
    }
    set({ ready: true });
    await fetchPending(ctx);
  }

  async function handle(event: DayEvent): Promise<void> {
    switch (event.type) {
      case 'text_submitted':
        return submitText(ctx, { ...event, declined: [], transcriptId: null });
      case 'another_asked':
        return askAnother(ctx);
      case 'one_thing_picked':
        return resolveTranscript(ctx);
      case 'session_set':
        await resolveTranscript(ctx);
        return setSession(ctx, event.minutes, event.treat ?? null);
      case 'session':
        return applySession(ctx, event.event);
      case 'drawer': {
        const { view } = drawerViewReducer({ open: memory.state.drawer.open }, event.event);
        return set({ drawer: { ...memory.state.drawer, open: view.open } });
      }
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
      case 'settings_changed':
        await repositories.settings.write(event.changes);
        set({ settings: await repositories.settings.read(deps.phoneLanguage()) });
        return refresh();
      case 'connection_returned':
        return fetchPending(ctx);
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

  const enqueue = (work: () => Promise<void>) => {
    const run = queue.then(work);
    queue = run.catch(() => undefined);
    return run;
  };

  return {
    getState: () => memory.state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    dispatch: (event) => enqueue(() => handle(event)),
    start: () => enqueue(rebuild),
    screen: {
      showLine: (slot, text) => set({ line: { slot, text } }),
      showBurst: (burst) => set({ burst }),
      handOverTreat: (treat) => set({ treat }),
      showParkedThoughts: (thoughts) => set({ parkedThoughts: thoughts }),
    },
  };
}
