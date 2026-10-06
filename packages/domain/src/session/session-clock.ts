import { MINUTE_MS, type Instant } from '../day';

import type { LiveSession, SessionEffect, TimedPhase } from './session-types';

export const WARNING_BEFORE_END_MS = 2 * MINUTE_MS;
/** Shorter sessions get no timed check-in: there is not enough time to be stuck in. */
export const CHECK_IN_FROM_MINUTES = 10;

const timedPhases: readonly string[] = ['running', 'stuck', 'holding'] satisfies TimedPhase[];

/** The timer is still counting down as far as the state knows. */
export function isTimed(state: LiveSession): boolean {
  return timedPhases.includes(state.phase);
}

/** When the two-minutes-left warning is due; `null` for a session too short to have one. */
export function warningAt(state: LiveSession): Instant | null {
  if (state.startedAt === null || state.endsAt === null) return null;
  const at = state.endsAt - WARNING_BEFORE_END_MS;
  return at > state.startedAt ? at : null;
}

/** When the timed check-in is due: half-way through a session of ten minutes or more. */
export function checkInAt(state: LiveSession): Instant | null {
  if (state.startedAt === null || state.endsAt === null) return null;
  if (state.endsAt - state.startedAt < CHECK_IN_FROM_MINUTES * MINUTE_MS) return null;
  return state.startedAt + (state.endsAt - state.startedAt) / 2;
}

export interface LiveStep {
  readonly state: LiveSession;
  readonly effects: SessionEffect[];
}

/**
 * Brings a session up to `now`: time up, the two-minute warning, or the timed check-in, whichever
 * comes first. `loud` is false when the moment passed while the app was away: the state and the
 * line still arrive, but no sound or haptic plays late.
 */
export function catchUp(state: LiveSession, now: Instant, loud: boolean): LiveStep {
  if (!isTimed(state) || state.endsAt === null) return { state, effects: [] };
  // Time was already called during this hold.
  if (state.heldFrom === 'time_up') return { state, effects: [] };
  const full = state.tone === 'full';
  const effects: SessionEffect[] = [];

  if (now >= state.endsAt) {
    effects.push({ kind: 'end_live_activity' });
    if (full) effects.push({ kind: 'show_line', line: 'timeUp' });
    if (full && loud)
      effects.push({ kind: 'play_cue', cue: 'nudge' }, { kind: 'haptic', pattern: 'nudge' });
    const done = { ...state, warned: true, checkedIn: true };
    return {
      state:
        state.phase === 'holding'
          ? { ...done, heldFrom: 'time_up' }
          : { ...done, phase: 'time_up' },
      effects,
    };
  }

  const warnAt = warningAt(state);
  if (!state.warned && warnAt !== null && now >= warnAt) {
    if (full) effects.push({ kind: 'show_line', line: 'twoMinutesLeft' });
    if (full && loud) {
      effects.push(
        { kind: 'play_cue', cue: 'two-minutes-left' },
        { kind: 'haptic', pattern: 'two-minutes-left' },
      );
    }
    return { state: { ...state, warned: true, checkedIn: true }, effects };
  }

  const checkAt = checkInAt(state);
  if (!state.checkedIn && state.phase === 'running' && checkAt !== null && now >= checkAt) {
    effects.push({ kind: 'show_line', line: full ? 'checkIn' : 'tinyNextStep' });
    if (full && loud)
      effects.push({ kind: 'play_cue', cue: 'nudge' }, { kind: 'haptic', pattern: 'nudge' });
    return { state: { ...state, phase: 'stuck', checkedIn: true }, effects };
  }

  return { state, effects };
}

/** The timers a running session needs, for the start and for a relaunch after the app was killed. */
export function timerEffects(state: LiveSession, now: Instant): SessionEffect[] {
  if (!isTimed(state) || state.endsAt === null) return [];
  const effects: SessionEffect[] = [{ kind: 'start_timer', until: state.endsAt }];
  const warnAt = warningAt(state);
  if (!state.warned && warnAt !== null) effects.push({ kind: 'schedule_warning', at: warnAt });
  const checkAt = checkInAt(state);
  if (!state.checkedIn && checkAt !== null && now < checkAt) {
    effects.push({ kind: 'schedule_check_in', at: checkAt });
  }
  return effects;
}
