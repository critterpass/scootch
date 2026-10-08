import { DRAWER_CLOSED, currentScootchDay, isoFromInstant, type ClockTime } from '@scootch/domain';

import { defaultSettings } from '../data/repositories/settings';
import type { EffectSwitches, ScreenSink } from '../effects/adapters';

import { NOTHING_SAID, applyCareEvent, crisisInWords, setSeriousAside } from './care-flow';
import { DEFAULT_USUAL_START, usualStart } from './day-notifications';
import {
  editDrawerItem,
  editWaitingTask,
  removeDrawerItem,
  removeWaitingTask,
  swapWaitingTaskIn,
} from './drawer-flow';
import { readToday } from './day-refresh';
import { openDay } from './day-rollover';
import {
  PASSIVE_EVENTS,
  isPickEvent,
  type DayContext,
  type DayEvent,
  type DayMemory,
  type DayState,
  type DayStoreDeps,
} from './day-types';
import { NO_AFTER_LINES } from './lines';
import { applyPickEvent } from './pick-events';
import { drawerEvent, setChosenSession } from './pick-flow';
import { resolveThought } from './parked-thoughts';
import { UNDER_WAY, applySession } from './session-flow';
import { closeStraySessions, dayOfRunningSession, restoreSession } from './session-restore';
import { adoptHunt } from './hunt-adoption';
import { closeSession, followTableClock, shortenSession, turnWorkingLine } from './session-moments';
import { applyFromOutside } from './notification-actions';
import { applySurfaceAction, noticePickUp } from './surface-actions';
import { cancelOneThing, parkStartedTask } from './way-out';
import { beFunny, cancelTaskCall, fetchPending, resolveTranscript, submitText } from './task-flow';

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
  returnedText: null,
  notice: null,
  modelDown: false,
  reminderAt: null,
  waitingForTomorrow: null,
  heardDeadlines: [],
  line: null,
  burst: null,
  treat: null,
  parkedThoughts: [],
  afterLines: NO_AFTER_LINES,
  drawer: { open: false, items: [] },
  heavyToday: false,
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
    untrustedTaskId: null,
    screenAskedAt: null,
    stopWaiting: null,
    askingPending: false,
  };
  let usual: ClockTime = DEFAULT_USUAL_START;
  let queue: Promise<void> = Promise.resolve();
  /** What the step now running has left arriving. Each dispatch waits for its own, not for others'. */
  let leftArriving: Promise<void>[] = [];

  const enqueue = (work: () => Promise<void>, arriving: Promise<void>[]) => {
    const run = queue.then(() => {
      leftArriving = arriving;
      return work();
    });
    queue = run.catch(() => undefined);
    return run;
  };
  /** A failure is never silent: it goes to the crash reporter, and the screen says so plainly. */
  const failed = (error: unknown) => {
    deps.onFailure?.(error);
    if (memory.state.ready) set({ notice: 'failed', taskCall: 'idle' });
  };
  const later: DayContext['later'] = (arrives, work) => {
    const arriving = leftArriving;
    arriving.push(arrives.then((value) => enqueue(() => work(value), arriving)).catch(failed));
  };
  /** Runs one step, then waits for everything it left arriving, and what that left in turn. */
  const run = async (work: () => Promise<void>) => {
    const arriving: Promise<void>[] = [];
    await enqueue(work, arriving);
    for (let seen = 0; seen < arriving.length; seen += 1) await arriving[seen];
  };

  /** True while today is rebuilt under screens that are already showing: they see only the result. */
  let rebuilding = false;
  const set = (changes: Partial<DayState>) => {
    memory.state = { ...memory.state, ...changes };
    if (!rebuilding) for (const listener of listeners) listener();
  };

  const refresh = () => readToday({ deps, memory, set }, usual);

  const ctx: DayContext = { deps, memory, set, refresh, later, now: () => deps.clock.now() };

  /**
   * A session keeps the day it started on: while one is under way, or its last screens are still
   * showing, the day does not turn under it. The turn is applied when it is closed.
   */
  const sessionHoldsDay = () => {
    const { session } = memory.state;
    return session !== null && session.phase !== 'set' && session.phase !== 'left_early';
  };
  const turnIfDue = () => {
    const latestDay = memory.state.localDate;
    if (!memory.state.ready || sessionHoldsDay()) return undefined;
    const now = currentScootchDay({ now: ctx.now(), timeZone: deps.timeZone(), latestDay });
    return now === latestDay ? undefined : rebuild();
  };

  /**
   * Today from storage. When screens are already showing they stay mounted (what is typed in
   * them is theirs) and see the new day in one step.
   */
  async function rebuild(): Promise<void> {
    const before = memory.state;
    rebuilding = before.ready;
    try {
      await build();
    } catch (error) {
      // Screens that were showing keep the day they had; the failure is said and reported.
      if (before.ready) memory.state = before;
      throw error;
    } finally {
      rebuilding = false;
    }
    // A session that did not come back has no timers and no Live Activity left running.
    const { session } = memory.state;
    if (session === null || session.phase === 'let_go' || !UNDER_WAY.includes(session.phase)) {
      deps.runner.run([{ kind: 'cancel_timer' }, { kind: 'end_live_activity' }], NOTHING_SAID);
    }
    set({ ready: true });
    await fetchPending(ctx);
  }

  async function build(): Promise<void> {
    const now = ctx.now();
    const timeZone = deps.timeZone();
    await repositories.transcripts.purgeOld(now);
    const settings = await repositories.settings.read(deps.phoneLanguage());

    const days = await repositories.days.all();
    const latestDay = days.at(-1)?.localDate ?? null;
    // A session still inside its planned time keeps its day, also when the app is opened cold.
    const localDate =
      (await dayOfRunningSession(ctx, latestDay)) ??
      currentScootchDay({ now, timeZone, latestDay });
    memory.lastOpenedDay = days.findLast((day) => day.localDate < localDate)?.localDate ?? null;
    const opened = days.map((day) => day.localDate);
    if (!opened.includes(localDate)) {
      await repositories.days.put({
        localDate,
        status: 'open',
        openedAt: isoFromInstant(now),
        morningLine: null,
        energy: null,
      });
    }

    await closeStraySessions(ctx);
    await openDay(ctx, localDate, opened);

    usual = usualStart(await repositories.sessions.all(), timeZone);
    memory.offer = null;
    memory.sessionRowId = null;
    memory.restPending = false;
    memory.turnedDown = [];
    memory.untrustedTaskId = null;
    set({ ...NOT_READY, settings, localDate, drawer: { ...DRAWER_CLOSED, items: [] } });
    await refresh();
    if (memory.state.today.kind !== 'crisis') {
      await restoreSession(ctx, await repositories.tasks.where('localDate', localDate));
    }
  }

  async function handle(event: DayEvent): Promise<void> {
    // A crisis day takes no events but the app's own comings and goings, and its own way out:
    // the care screen being closed. Nothing else gets round it.
    if (event.type === 'care_closed') return applyCareEvent(ctx, event);
    if (memory.state.today.kind === 'crisis' && !PASSIVE_EVENTS.includes(event.type)) return;
    if (memory.state.notice === 'failed' && !PASSIVE_EVENTS.includes(event.type)) {
      set({ notice: null });
    }
    if (await crisisInWords(ctx, event)) return;
    if (isPickEvent(event)) return applyPickEvent(ctx, event);
    switch (event.type) {
      case 'text_submitted':
        return submitText(ctx, { ...event, transcriptId: null });
      case 'task_call_cancelled':
        return cancelTaskCall(ctx);
      case 'returned_text_taken':
        return set({ returnedText: null });
      case 'session_set':
        await resolveTranscript(ctx);
        return setChosenSession(ctx, event.minutes, event.treat ?? null);
      case 'session':
        return applySession(ctx, event.event);
      case 'drawer':
        return drawerEvent(ctx, event.event);
      case 'drawer_item_removed':
        return removeDrawerItem(ctx, event.itemId);
      case 'waiting_task_removed':
        return removeWaitingTask(ctx, event.taskId);
      case 'waiting_task_edited':
        return editWaitingTask(ctx, event.taskId, event.text);
      case 'waiting_task_swapped_in':
        return swapWaitingTaskIn(ctx, event.taskId);
      case 'drawer_item_edited':
        return editDrawerItem(ctx, event.itemId, event.text);
      case 'thought_resolved':
        return resolveThought(ctx, event.thought, event.resolution);
      case 'working_line_turned':
        return turnWorkingLine(ctx);
      case 'session_closed':
        await closeSession(ctx);
        return turnIfDue();
      case 'table_clock':
        return followTableClock(ctx, event.endsAt);
      case 'developer_session_ends_in':
        return shortenSession(ctx, event.seconds);
      case 'started_task_parked':
        return parkStartedTask(ctx);
      case 'one_thing_cancelled':
        return cancelOneThing(ctx);
      case 'entitlement_changed':
        return refresh();
      case 'be_funny_asked':
        return beFunny(ctx);
      case 'serious_set_aside':
        await resolveTranscript(ctx);
        return setSeriousAside(ctx);
      case 'reminder_asked':
        return applyCareEvent(ctx, event);
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
      case 'hunt_adopted':
        return adoptHunt(ctx, event.hunt);
      case 'thing_shared_in':
      case 'bite_ticked':
      case 'hunt_tomorrow':
      case 'monster_turned_down':
        return applyFromOutside(ctx, event);
      case 'surface_request_taken':
        return set({ surfaceRequest: null });
      case 'camera_step_chosen':
        return set({ surfaceRequest: { kind: 'composer', listening: false, text: event.text } });
      case 'opened_mid_session':
        return noticePickUp(ctx);
      case 'app_backgrounded':
        return applySession(ctx, { type: 'backgrounded' });
      case 'day_turned':
        // A day left open overnight ends at its boundary, a crisis day included.
        return turnIfDue();
      case 'app_foregrounded': {
        const day = memory.state.localDate;
        await turnIfDue();
        if (memory.state.localDate !== day) return;
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
    dispatch: (event) =>
      run(() => handle(event)).catch((error: unknown) => {
        failed(error);
        throw error;
      }),
    start: () => run(rebuild),
    screen: {
      showLine: (slot, text) => set({ line: { slot, text } }),
      showBurst: (burst) => set({ burst }),
      handOverTreat: (treat) => set({ treat }),
      showParkedThoughts: (thoughts) => set({ parkedThoughts: thoughts }),
    },
  };
}
