/**
 * Time for the board's rules. Nothing here reads a clock: every rule takes the moment it is asked
 * at, and the app passes one from a `Clock`, which tests replace with a fixed one.
 */

/** Epoch milliseconds. */
export type Instant = number;
/** A calendar day on the user's wall clock, `YYYY-MM-DD`. */
export type IsoDate = string;
/** A time of day on the user's wall clock, `HH:mm`. */
export type ClockTime = string;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** One moment, read three ways: the instant, the wall-clock day and the minutes since midnight. */
export type Moment = {
  readonly at: Instant;
  readonly day: IsoDate;
  /** Minutes since midnight on the wall clock, 0 to 1439. */
  readonly minuteOfDay: number;
};

/** Where the rules get "now" from. */
export type Clock = () => Moment;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The moment an instant is on the wall clock of one time zone. */
export function momentAt(at: Instant, timeZone: string): Moment {
  const parts: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(at)) parts[part.type] = part.value;
  return {
    at,
    day: `${parts['year']}-${parts['month']}-${parts['day']}`,
    minuteOfDay: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}

/** A clock that reads the device's time in one zone. */
export function wallClock(timeZone: string, read: () => Instant = Date.now): Clock {
  return () => momentAt(read(), timeZone);
}

/** The instant the wall-clock day of a moment began, to the minute. */
export function dayStartOf(moment: Moment): Instant {
  const intoMinute = ((moment.at % MINUTE_MS) + MINUTE_MS) % MINUTE_MS;
  return moment.at - intoMinute - moment.minuteOfDay * MINUTE_MS;
}

function utcOf(day: IsoDate): number {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const time = utcOf(value);
  return new Date(time).toISOString().slice(0, 10) === value;
}

export function addDays(day: IsoDate, days: number): IsoDate {
  return new Date(utcOf(day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((utcOf(to) - utcOf(from)) / DAY_MS);
}

/** 0 for Sunday to 6 for Saturday. */
export function weekdayOf(day: IsoDate): number {
  return new Date(utcOf(day)).getUTCDay();
}

/** Minutes since midnight for `HH:mm`, or `null` when it is not a clock time. */
export function minutesOf(time: ClockTime): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (match === null) return null;
  const [hour, minute] = [Number(match[1]), Number(match[2])];
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}
