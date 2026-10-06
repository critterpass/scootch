import type { DrawerItemRow, Id, IsoDate, TaskRow } from '../contracts';

import { daysBetween } from './local-time';

/** Away for this many days or more, the morning asks for the smallest possible thing. */
export const LONG_AWAY_DAYS = 7;
export const SMALLEST_ASK_MINUTES = 2;

/**
 * What the morning offers. No variant holds a number of days, a date of the last visit or anything
 * else that could be read as a count of time away.
 */
export type MorningOffer =
  /** The smallest possible ask: a couple of minutes of anything, or just company. */
  | { readonly kind: 'smallest_ask'; readonly minutes: number }
  /** A dated thing from the drawer is back as the one thing. */
  | { readonly kind: 'deadline_returns'; readonly drawerItemId: Id }
  /** Yesterday's task, offered smaller than it was left. */
  | { readonly kind: 'carried_over'; readonly taskId: Id; readonly makeSmaller: true }
  | { readonly kind: 'fresh_ask' };

export interface MorningInput {
  readonly today: IsoDate;
  /** The last day the app was opened before today; `null` on a first launch. */
  readonly lastOpenedDay: IsoDate | null;
  readonly tasks: readonly TaskRow[];
  /** The dated drawer item due back this morning, if any. */
  readonly returning: DrawerItemRow | null;
}

export function morningOffer(input: MorningInput): MorningOffer {
  const away = input.lastOpenedDay === null ? 0 : daysBetween(input.lastOpenedDay, input.today);
  if (away >= LONG_AWAY_DAYS) return { kind: 'smallest_ask', minutes: SMALLEST_ASK_MINUTES };

  if (input.returning) return { kind: 'deadline_returns', drawerItemId: input.returning.id };

  const carried = input.tasks.find(
    (task) => task.localDate === input.today && task.carriedOver && task.status !== 'finished',
  );
  if (carried) return { kind: 'carried_over', taskId: carried.id, makeSmaller: true };

  return { kind: 'fresh_ask' };
}
