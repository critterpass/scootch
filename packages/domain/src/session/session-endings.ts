import type { FinishMethod } from '../contracts';
import type { Instant } from '../day';

import type { LiveStep } from './session-clock';
import type { LiveSession, SessionEffect, SessionStep } from './session-types';

function thoughtsEffect(state: LiveSession): SessionEffect[] {
  return state.thoughts.length > 0
    ? [{ kind: 'show_parked_thoughts', thoughts: state.thoughts }]
    : [];
}

/**
 * Every finish method ends here: the same state and the same reward. Only the stored method
 * differs. A serious task gets the quiet cue and no burst.
 */
export function finish(state: LiveSession, method: FinishMethod, now: Instant): LiveStep {
  const effects: SessionEffect[] = [
    { kind: 'cancel_timer' },
    { kind: 'end_live_activity' },
    {
      kind: 'record_session_end',
      outcome: 'finished',
      finishMethod: method,
      notFinishedChoice: null,
      endedAt: now,
    },
    { kind: 'grant_finish_reward', taskId: state.taskId, tone: state.tone },
  ];
  if (state.tone === 'full') {
    effects.push(
      { kind: 'show_burst', burst: 'confetti' },
      { kind: 'play_cue', cue: 'finish' },
      { kind: 'haptic', pattern: 'finish' },
      { kind: 'show_line', line: 'caught' },
    );
    if (state.treat !== null) effects.push({ kind: 'hand_over_treat', treat: state.treat });
  } else {
    effects.push(
      { kind: 'play_cue', cue: 'quiet-finish' },
      { kind: 'haptic', pattern: 'quiet-finish' },
      { kind: 'show_line', line: 'done' },
    );
  }
  effects.push(...thoughtsEffect(state));
  return { state: { ...state, phase: 'finished', heldFrom: null, endedAt: now }, effects };
}

/** Leaving early is unremarked: the timer stops and nothing is said, played or offered. */
export function leaveEarly(state: LiveSession, now: Instant): LiveStep {
  return {
    state: { ...state, phase: 'left_early', heldFrom: null, endedAt: now },
    effects: [
      { kind: 'cancel_timer' },
      { kind: 'end_live_activity' },
      {
        kind: 'record_session_end',
        outcome: 'left_early',
        finishMethod: null,
        notFinishedChoice: null,
        endedAt: now,
      },
    ],
  };
}

/**
 * "Not finished" is a normal outcome: one line, then three calm choices. Said before time is up
 * (the person chose to stop), the Live Activity ends with the timer.
 */
export function notFinished(state: LiveSession, now: Instant): LiveStep {
  const effects: SessionEffect[] = [{ kind: 'cancel_timer' }];
  if (state.phase !== 'time_up') effects.push({ kind: 'end_live_activity' });
  effects.push({ kind: 'show_line', line: 'notFinished' });
  return { state: { ...state, phase: 'not_finished', heldFrom: null, endedAt: now }, effects };
}

export function chooseAfterNotFinished(
  state: LiveSession,
  choice: 'carry_on' | 'make_smaller' | 'let_go',
  now: Instant,
): SessionStep {
  if (choice === 'let_go') {
    // The thoughts parked on the way are the user's own, not the task: they are still handed over.
    return {
      state: { phase: 'let_go' },
      effects: [{ kind: 'forget_task', taskId: state.taskId }, ...thoughtsEffect(state)],
    };
  }
  const record: SessionEffect = {
    kind: 'record_session_end',
    outcome: 'not_finished',
    finishMethod: null,
    notFinishedChoice: choice,
    endedAt: state.endedAt ?? now,
  };
  if (choice === 'carry_on') {
    return {
      state: { ...state, phase: 'carried_over' },
      effects: [
        record,
        { kind: 'carry_task_to_tomorrow', taskId: state.taskId },
        ...thoughtsEffect(state),
      ],
    };
  }
  return {
    state: {
      ...state,
      phase: 'made_smaller',
      ask: { ...state.ask, shrinkCount: state.ask.shrinkCount + 1 },
    },
    effects: [record, { kind: 'shrink_task', taskId: state.taskId }, ...thoughtsEffect(state)],
  };
}
