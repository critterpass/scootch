import type { ClockTime, IsoDate, IsoDateTime } from '../contracts';

/**
 * An instant as epoch milliseconds. Nothing in this package reads a clock: the current instant is
 * always an argument.
 */
export type Instant = number;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export function instantFromIso(value: IsoDateTime): Instant {
  return Date.parse(value);
}

export function isoFromInstant(instant: Instant): IsoDateTime {
  return new Date(instant).toISOString();
}

/** What a wall clock in one time zone shows at an instant, to the minute. */
export interface LocalDateTime {
  readonly date: IsoDate;
  readonly hour: number;
  readonly minute: number;
}

// Building a formatter is slow; one per zone is kept. The cache never changes a result.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
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

export function localDateTime(instant: Instant, timeZone: string): LocalDateTime {
  const found: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) found[part.type] = part.value;
  return {
    date: `${found['year']}-${found['month']}-${found['day']}`,
    hour: Number(found['hour']),
    minute: Number(found['minute']),
  };
}

function dateAsUtc(date: IsoDate, extraDays = 0): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day + extraDays);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(dateAsUtc(date, days)).toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((dateAsUtc(to) - dateAsUtc(from)) / DAY_MS);
}

export function clockMinutes(clock: ClockTime): number {
  const [hour = 0, minute = 0] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * The instant a wall clock in `timeZone` shows `clock` on `date`. A time the clock skips when it
 * springs forward resolves to the same distance past the jump (02:30 becomes 03:30).
 */
export function instantOfLocal(date: IsoDate, clock: ClockTime, timeZone: string): Instant {
  const wanted = dateAsUtc(date) + clockMinutes(clock) * MINUTE_MS;
  const shownAt = (instant: Instant) => {
    const local = localDateTime(instant, timeZone);
    return dateAsUtc(local.date) + (local.hour * 60 + local.minute) * MINUTE_MS;
  };
  let guess = wanted;
  for (let pass = 0; pass < 2; pass += 1) guess += wanted - shownAt(guess);
  const shown = shownAt(guess);
  return shown < wanted ? guess + (wanted - shown) : guess;
}
