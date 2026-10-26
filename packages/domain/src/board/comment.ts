import { oneIn } from './seed';
import type { CommentStep } from './task';

/** The ladder, lowest first. */
export const COMMENT_LADDER: readonly CommentStep[] = ['fine', 'good', 'good work', 'ten'];

/** A wait of this many days counts for something; this many more counts for a lot. */
export const SOME_WAIT_DAYS = 1;
export const LONG_WAIT_DAYS = 7;

/** Of the finishes strong on all three counts, about one in this many gets the circled 10. */
export const TEN_ONE_IN = 40;

/** Of the circled 10s, about one in this many also earns the giấy khen. */
export const GIAY_KHEN_ONE_IN_TENS = 5;

export type CommentInput = {
  /** The first period on it began inside the fuse. */
  readonly insideFuse: boolean;
  /** Tally marks it carries: accepted reasons do not count. */
  readonly tallies: number;
  /** Whole days from being said to being finished. */
  readonly waitedDays: number;
  /** A serious or crisis task is not graded. */
  readonly heavy: boolean;
  /** Fixed per finish, so the same finish always gets the same comment. */
  readonly seed: string;
};

/**
 * His written comment (brief 5), as a rung on the ladder; the words come from the voice pack.
 * One point for starting inside the fuse, one for finishing with no tally, and one or two for how
 * long it had waited (a day, a week). Up to one point is "Fine.", two is "Good.", three or more is
 * "Good work.". The circled 10 needs all three at full strength and then a seeded one in forty.
 * `null` for a serious or crisis task.
 */
export function commentFor(input: CommentInput): CommentStep | null {
  if (input.heavy) return null;
  const clean = input.tallies === 0;
  const wait = input.waitedDays >= LONG_WAIT_DAYS ? 2 : input.waitedDays >= SOME_WAIT_DAYS ? 1 : 0;
  const strong = input.insideFuse && clean && wait === 2;
  if (strong && oneIn(TEN_ONE_IN, input.seed, 'ten')) return 'ten';
  const points = (input.insideFuse ? 1 : 0) + (clean ? 1 : 0) + wait;
  return points >= 3 ? 'good work' : points === 2 ? 'good' : 'fine';
}

/**
 * The giấy khen, the rarest thing in the app: only ever on a circled 10, and then about one in
 * five, so it is always rarer than the 10 itself.
 */
export function earnsGiayKhen(comment: CommentStep | null, seed: string): boolean {
  return comment === 'ten' && oneIn(GIAY_KHEN_ONE_IN_TENS, seed, 'giay khen');
}
