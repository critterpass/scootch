import { DAY_MS, dayStartOf, type Instant, type Moment } from './moment';
import { isOpen, type Task } from './task';

/** The first offer comes after this many finishes, at the next recess. */
export const FIRST_OFFER_AFTER_FINISHES = 3;
/** Once the notice has been pinned and left, it is not pinned again for this many days. */
export const OFFER_REST_DAYS = 14;

export type TuitionOfferInput = {
  readonly now: Moment;
  /** Finishes at the desk so far, ever. */
  readonly finishes: number;
  /** Recess has just begun. The notice is only ever pinned at a recess. */
  readonly atRecess: boolean;
  /** Something heavy is in today (see `hasHeavyToday`), or the crisis screen was shown today. */
  readonly heavyToday: boolean;
  /** Tuition is already paid or in its free week. */
  readonly enrolled: boolean;
  /** When the notice was last pinned, `null` if never. Pinned and not taken is ignored. */
  readonly lastPinnedAt: Instant | null;
};

/**
 * Whether to pin the tuition notice on the chalkboard now (brief 7): after the third finish, at
 * a recess, never on a day with something heavy in it, and not again for two weeks once ignored.
 */
export function tuitionNoticeDue(input: TuitionOfferInput): boolean {
  if (input.enrolled || !input.atRecess || input.heavyToday) return false;
  if (input.finishes < FIRST_OFFER_AFTER_FINISHES) return false;
  return (
    input.lastPinnedAt === null || input.now.at - input.lastPinnedAt >= OFFER_REST_DAYS * DAY_MS
  );
}

/**
 * Whether today has something heavy in it: a serious or crisis task still open, or one said,
 * finished or erased today.
 */
export function hasHeavyToday(tasks: readonly Task[], now: Moment): boolean {
  const todayFrom = dayStartOf(now);
  return tasks.some(
    (task) =>
      task.care !== 'none' &&
      (isOpen(task) || task.createdAt >= todayFrom || task.lastTouched >= todayFrom),
  );
}
