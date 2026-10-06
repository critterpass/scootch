import type { DrawerItemRow, Id, IsoDate, TaskRow } from '../contracts';

import { daysBetween } from './local-time';

/** Away for this many days or more, the morning asks for the smallest possible thing. */
export const LONG_AWAY_DAYS = 7;
export const SMALLEST_ASK_MINUTES = 2;
/** A dated thing due this soon is mentioned beside the smallest ask. */
export const NOTE_DUE_WITHIN_DAYS = 3;

/** A dated drawer item mentioned quietly beside the offer. It is never the ask itself. */
export interface QuietNote {
  readonly drawerItemId: Id;
  readonly dueDate: IsoDate;
}

/**
 * What the morning offers. No variant holds a number of days, a date of the last visit or anything
 * else that could be read as a count of time away.
 */
export type MorningOffer =
  /**
   * The smallest possible ask: a couple of minutes of anything, or just company. A deadline that
   * is back or close rides along as a note, so it is not missed and is not the demand either.
   */
  | { readonly kind: 'smallest_ask'; readonly minutes: number; readonly note: QuietNote | null }
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
  /** The whole drawer, read only for a date that is close. */
  readonly drawer: readonly DrawerItemRow[];
}

/** The one dated item worth a note: back this morning, or due within three days. Nearest date first. */
function noteFor(input: MorningInput): QuietNote | null {
  const close = [...(input.returning ? [input.returning] : []), ...input.drawer]
    .filter(
      (item) =>
        item.dueDate !== null &&
        ((item.returnOn !== null && item.returnOn <= input.today) ||
          daysBetween(input.today, item.dueDate) <= NOTE_DUE_WITHIN_DAYS),
    )
    .sort(
      (a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.id.localeCompare(b.id),
    )[0];
  return close?.dueDate ? { drawerItemId: close.id, dueDate: close.dueDate } : null;
}

export function morningOffer(input: MorningInput): MorningOffer {
  const away = input.lastOpenedDay === null ? 0 : daysBetween(input.lastOpenedDay, input.today);
  if (away >= LONG_AWAY_DAYS) {
    return { kind: 'smallest_ask', minutes: SMALLEST_ASK_MINUTES, note: noteFor(input) };
  }

  if (input.returning) return { kind: 'deadline_returns', drawerItemId: input.returning.id };

  const carried = input.tasks.find(
    (task) => task.localDate === input.today && task.carriedOver && task.status !== 'finished',
  );
  if (carried) return { kind: 'carried_over', taskId: carried.id, makeSmaller: true };

  return { kind: 'fresh_ask' };
}
