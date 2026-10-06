import type { Id, TaskRow } from '../contracts';
import { MINUTE_MS, type Instant } from '../day';
import { isQuietTask } from '../day/today-state';

import { catchUp, isTimed, timerEffects, type LiveStep } from './session-clock';
import { chooseAfterNotFinished, finish, leaveEarly, notFinished } from './session-endings';
import type {
  LiveSession,
  ParkedThought,
  SessionEffect,
  SessionEvent,
  SessionState,
  SessionStep,
  SessionTone,
} from './session-types';

export function sessionTone(task: Pick<TaskRow, 'screen' | 'seriousOverridden'>): SessionTone {
  return isQuietTask(task) ? 'quiet' : 'full';
}

export interface SessionSetInput {
  readonly taskId: Id;
  readonly tone: SessionTone;
  /** The length the user picked: 10, 25 or 50. Events can only bring it down from here. */
  readonly minutes: number;
  readonly shrinkCount?: number;
  readonly treat?: string | null;
}

/** A session that is set and waiting for the start. */
export function sessionSet(input: SessionSetInput): LiveSession {
  return {
    phase: 'set',
    taskId: input.taskId,
    tone: input.tone,
    ask: { minutes: input.minutes, shrinkCount: input.shrinkCount ?? 0 },
    treat: input.treat ?? null,
    startedAt: null,
    endsAt: null,
    endedAt: null,
    warned: false,
    checkedIn: false,
    inForeground: true,
    heldFrom: null,
    stepShrinks: 0,
    thoughts: [],
  };
}

/** Parked thoughts stay hidden until the session is over. */
export function visibleThoughts(state: SessionState): readonly ParkedThought[] {
  if (state.phase === 'let_go') return [];
  return ['finished', 'carried_over', 'made_smaller'].includes(state.phase) ? state.thoughts : [];
}

const ended: readonly string[] = ['finished', 'left_early', 'carried_over', 'made_smaller'];
const unchanged = (state: LiveSession): LiveStep => ({ state, effects: [] });

function start(state: LiveSession, now: Instant): LiveStep {
  const endsAt = now + state.ask.minutes * MINUTE_MS;
  const running: LiveSession = { ...state, phase: 'running', startedAt: now, endsAt };
  const effects: SessionEffect[] = [
    ...timerEffects(running, now),
    { kind: 'start_live_activity', until: endsAt },
    { kind: 'grant_start_reward', taskId: state.taskId, tone: state.tone },
  ];
  if (state.tone === 'full') {
    effects.push(
      { kind: 'show_burst', burst: 'start' },
      { kind: 'play_cue', cue: 'start-burst' },
      { kind: 'haptic', pattern: 'start-burst' },
      { kind: 'show_line', line: 'start' },
    );
  } else {
    effects.push({ kind: 'show_line', line: 'acknowledge' });
  }
  return { state: running, effects };
}

/** A hold that stops short puts everything back as it was. */
function dropHold(state: LiveSession): LiveSession {
  return state.phase === 'holding' && state.heldFrom !== null
    ? { ...state, phase: state.heldFrom, heldFrom: null }
    : state;
}

function away(state: LiveSession, killed: boolean): LiveStep {
  const effects: SessionEffect[] =
    state.phase === 'holding' && !killed ? [{ kind: 'stop_cue', cue: 'hold-rising' }] : [];
  return { state: { ...dropHold(state), inForeground: false }, effects };
}

function back(state: LiveSession, now: Instant, relaunched: boolean): LiveStep {
  const caught = catchUp({ ...dropHold(state), inForeground: true }, now, false);
  return relaunched
    ? { state: caught.state, effects: [...timerEffects(caught.state, now), ...caught.effects] }
    : caught;
}

function act(state: LiveSession, event: SessionEvent, now: Instant): SessionStep {
  const { phase } = state;
  const full = state.tone === 'full';
  const canFinish = phase === 'running' || phase === 'stuck' || phase === 'time_up';
  switch (event.type) {
    case 'bargained': {
      if (phase !== 'set' || !Number.isFinite(event.minutes)) return unchanged(state);
      const minutes = Math.min(state.ask.minutes, Math.max(1, Math.floor(event.minutes)));
      return unchanged({ ...state, ask: { ...state.ask, minutes } });
    }
    case 'too_big': {
      if (phase !== 'set') return unchanged(state);
      const effects: SessionEffect[] = [{ kind: 'shrink_task', taskId: state.taskId }];
      if (full) effects.push({ kind: 'play_cue', cue: 'shrink' });
      const ask = { ...state.ask, shrinkCount: state.ask.shrinkCount + 1 };
      return { state: { ...state, ask }, effects };
    }
    case 'started':
      return phase === 'set' ? start(state, now) : unchanged(state);
    case 'clock':
      return unchanged(state);
    case 'thought_parked': {
      const text = event.text.trim();
      if ((phase !== 'running' && phase !== 'stuck') || text === '') return unchanged(state);
      const thought: ParkedThought = { text, parkedAt: now };
      const effects: SessionEffect[] = [{ kind: 'save_parked_thought', thought }];
      if (full) effects.push({ kind: 'play_cue', cue: 'park-a-thought' });
      effects.push({ kind: 'show_line', line: 'thoughtParked' });
      return { state: { ...state, thoughts: [...state.thoughts, thought] }, effects };
    }
    case 'stuck_tapped':
      if (phase !== 'running') return unchanged(state);
      return {
        state: { ...state, phase: 'stuck', checkedIn: true },
        effects: [{ kind: 'show_line', line: 'tinyNextStep' }],
      };
    case 'step_smaller':
      if (phase !== 'stuck') return unchanged(state);
      return {
        state: { ...state, stepShrinks: state.stepShrinks + 1 },
        effects: [{ kind: 'show_line', line: 'tinyNextStep' }],
      };
    case 'step_accepted':
      return phase === 'stuck' ? unchanged({ ...state, phase: 'running' }) : unchanged(state);
    case 'hold_started':
      if (!canFinish) return unchanged(state);
      return {
        state: { ...state, phase: 'holding', heldFrom: phase },
        effects: full
          ? [
              { kind: 'play_cue', cue: 'hold-rising' },
              { kind: 'haptic', pattern: 'hold-rising' },
            ]
          : [],
      };
    case 'hold_released': {
      if (phase !== 'holding') return unchanged(state);
      const effects: SessionEffect[] = [{ kind: 'stop_cue', cue: 'hold-rising' }];
      if (full) effects.push({ kind: 'show_line', line: 'releasedEarly' });
      return { state: dropHold(state), effects };
    }
    case 'hold_completed':
      return phase === 'holding' ? finish(state, 'hold', now) : unchanged(state);
    case 'double_tapped':
      return canFinish ? finish(state, 'double_tap', now) : unchanged(state);
    case 'said_done':
      return canFinish ? finish(state, 'voice', now) : unchanged(state);
    case 'finish_tapped':
      return canFinish && !full ? finish(state, 'tap', now) : unchanged(state);
    case 'not_finished':
      return phase === 'time_up' ? notFinished(state, now) : unchanged(state);
    case 'chose_carry_on':
      return phase === 'not_finished'
        ? chooseAfterNotFinished(state, 'carry_on', now)
        : unchanged(state);
    case 'chose_make_smaller':
      return phase === 'not_finished'
        ? chooseAfterNotFinished(state, 'make_smaller', now)
        : unchanged(state);
    case 'chose_let_go':
      return phase === 'not_finished'
        ? chooseAfterNotFinished(state, 'let_go', now)
        : unchanged(state);
    case 'left':
      return isTimed(state) ? leaveEarly(state, now) : unchanged(state);
    case 'backgrounded':
    case 'killed':
      return away(state, event.type === 'killed');
    case 'foregrounded':
    case 'relaunched':
      return back(state, now, event.type === 'relaunched');
  }
}

/**
 * The session as a reducer. The state is brought up to `now` first (time up, the warning, the
 * check-in), then the event is applied. Nothing here is performed: effects are returned as data.
 */
export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
  now: Instant,
): SessionStep {
  if (state.phase === 'let_go' || ended.includes(state.phase)) return { state, effects: [] };
  const lifecycle = ['backgrounded', 'killed', 'foregrounded', 'relaunched'].includes(event.type);
  const caught = lifecycle ? unchanged(state) : catchUp(state, now, true);
  const step = act(caught.state, event, now);
  return { state: step.state, effects: [...caught.effects, ...step.effects] };
}
