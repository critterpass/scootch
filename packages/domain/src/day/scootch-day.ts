import type { IsoDate } from '../contracts';

import { addDays, instantOfLocal, localDateTime, type Instant } from './local-time';

/** A Scootch day starts at this hour on the user's wall clock, so a late night belongs to the day before. */
export const DAY_ROLLOVER_HOUR = 4;

/**
 * The Scootch day an instant belongs to in one time zone. It follows the wall clock, so a day is 23
 * or 25 hours long when the clocks change, and it is never worked out in UTC.
 */
export function scootchDayOf(
  now: Instant,
  timeZone: string,
  rolloverHour: number = DAY_ROLLOVER_HOUR,
): IsoDate {
  const local = localDateTime(now, timeZone);
  return local.hour < rolloverHour ? addDays(local.date, -1) : local.date;
}

export interface CurrentDayInput {
  readonly now: Instant;
  /** The zone the phone is in now. */
  readonly timeZone: string;
  /** The newest day the phone already has a row for, in whatever zone it was opened. */
  readonly latestDay: IsoDate | null;
  readonly rolloverHour?: number;
}

/**
 * Today for a user who may have changed time zone. A day that has been opened is never reopened:
 * flying west keeps the day already under way, flying east may start the next one early.
 */
export function currentScootchDay(input: CurrentDayInput): IsoDate {
  const here = scootchDayOf(input.now, input.timeZone, input.rolloverHour);
  return input.latestDay !== null && input.latestDay > here ? input.latestDay : here;
}

/** The instant a Scootch day starts in one time zone. */
export function scootchDayStart(
  day: IsoDate,
  timeZone: string,
  rolloverHour: number = DAY_ROLLOVER_HOUR,
): Instant {
  return instantOfLocal(day, `${String(rolloverHour).padStart(2, '0')}:00`, timeZone);
}
