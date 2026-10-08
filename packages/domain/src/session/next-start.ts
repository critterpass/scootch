import type { IsoDate, NextStart } from '../contracts';
import { MINUTE_MS, daysBetween, type Instant } from '../day';

import type { LiveSession, SessionState } from './session-types';

/** As long as task text may be. */
const LINE_MAX = 280;
/** How long a sitting stays opened on the user's own line before it folds into the usual one. */
export const NEXT_START_SHOWN_MS = MINUTE_MS;

/**
 * The line as it is kept: the user's words, untouched but for the space around them, with the
 * day they were written. `null` when nothing was said, which is the same as Skip.
 */
export function nextStartFrom(text: string, writtenOn: IsoDate): NextStart | null {
  const line = text.trim().slice(0, LINE_MAX).trim();
  return line === '' ? null : { text: line, writtenOn };
}

/** What can happen to a task that holds a line for next time. */
export type NextStartMoment = 'carried_over' | 'made_smaller' | 'caught' | 'let_go';

/**
 * What is left of the line afterwards. Carrying the task on keeps it: that is what it was written
 * for. A smaller task is a different ask, a caught one has no next sitting and one let go leaves
 * nothing, so each of those clears it.
 */
export function nextStartAfter(
  nextStart: NextStart | null | undefined,
  moment: NextStartMoment,
): NextStart | null {
  return moment === 'carried_over' ? (nextStart ?? null) : null;
}

/**
 * The label over the kept line: "You, yesterday" only when it was written the day before. Any
 * other day it has no label, so nothing ever says how long ago that was.
 */
export function keptLineLabel(
  nextStart: Pick<NextStart, 'writtenOn'>,
  today: IsoDate,
): 'yesterday' | null {
  return daysBetween(nextStart.writtenOn, today) === 1 ? 'yesterday' : null;
}

/** The session without its kept line. */
export function withoutNextStart(state: LiveSession): LiveSession {
  const { nextStart: _cleared, ...rest } = state;
  return rest;
}

/** What a sitting opens on when the user left a line for it. */
export interface SessionOpening {
  /** The user's own words, word for word. */
  readonly text: string;
  readonly label: 'yesterday' | null;
  /** True for a serious task: the line is shown in plain company, with nothing around it. */
  readonly plain: boolean;
}

/**
 * The user's line, while the sitting is opened on it: from the task being set until a minute
 * after the start. Before any line of Scootch's, and `null` once it has folded away, when the
 * session is over, and when no line was left.
 */
export function sessionOpening(
  state: SessionState,
  now: Instant,
  today: IsoDate,
): SessionOpening | null {
  if (state.phase === 'let_go' || state.nextStart == null) return null;
  const open = ['set', 'running', 'stuck', 'holding'].includes(state.phase);
  if (!open) return null;
  if (state.startedAt !== null && now >= state.startedAt + NEXT_START_SHOWN_MS) return null;
  return {
    text: state.nextStart.text,
    label: keptLineLabel(state.nextStart, today),
    plain: state.tone === 'quiet',
  };
}
