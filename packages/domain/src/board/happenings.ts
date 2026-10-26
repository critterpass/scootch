import { choose, oneIn } from './seed';
import type { CareFlag } from './task';

/** The small things that happen in the classroom and are never explained (brief 5). */
export const HAPPENINGS = [
  'cat on the desk',
  'paper plane',
  'power cut',
  'sao do at the door',
  'principal at the window',
  'ice-cream bell',
  'pop quiz',
] as const;

export type Happening = (typeof HAPPENINGS)[number];

/** About one session in this many has a happening. */
export const HAPPENING_ONE_IN = 4;

/**
 * The happening for one session, or `null`. Chosen when the desk opens, before Start, so a pop
 * quiz can set the period's length. Never on a serious or crisis task. The seed is fixed per
 * session (the task and when it was put on the desk), so reopening the app does not reroll it.
 */
export function happeningFor(input: {
  readonly seed: string;
  readonly care: CareFlag;
}): Happening | null {
  if (input.care !== 'none') return null;
  if (!oneIn(HAPPENING_ONE_IN, input.seed, 'happening')) return null;
  return choose(HAPPENINGS, input.seed, 'which happening');
}
