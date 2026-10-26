import type { Instant } from './moment';
import { FRONT_ROW_AT_TALLIES, isHeavy, talliesOf, type Task } from './task';

/**
 * What he does with a late slip.
 * - `graded`: graded in red, one more tally.
 * - `accepted`: a real reason. "Accepted." and nothing else; no tally.
 * - `front row`: the fifth tally. "Five slips. Front row tomorrow."
 * - `quiet`: a serious or crisis task. It goes back on the board and nothing is recorded.
 */
export type SlipOutcome = 'graded' | 'accepted' | 'front row' | 'quiet';

export type SlipInput = {
  /** The excuse, said, typed or picked. */
  readonly reason: string;
  /** Whether it is a genuine reason. The caller decides; it is never guessed here. */
  readonly accepted: boolean;
};

/** Snoozing a task: it goes back on the board, with a tally unless the reason was accepted. */
export function lateSlip(
  task: Task,
  slip: SlipInput,
  at: Instant,
): { readonly task: Task; readonly outcome: SlipOutcome } {
  const back: Task = { ...task, status: 'board', desk: null, lastTouched: at };
  if (isHeavy(task)) return { task: back, outcome: 'quiet' };
  const slipped: Task = {
    ...back,
    slips: [...task.slips, { reason: slip.reason.trim(), accepted: slip.accepted, at }],
  };
  if (slip.accepted) return { task: slipped, outcome: 'accepted' };
  const outcome = talliesOf(slipped) === FRONT_ROW_AT_TALLIES ? 'front row' : 'graded';
  return { task: slipped, outcome };
}
