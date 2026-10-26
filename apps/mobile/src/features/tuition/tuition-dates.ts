import {
  addDays,
  DAY_MS,
  instantOfLocal,
  localDateTime,
  type Instant,
  type IsoDate,
} from '@phusclass/domain';

import type { StorePeriod } from './purchases-port';

/** His note goes out this many days before every charge. */
export const NOTE_DAYS_BEFORE_CHARGE = 2;
/** At this time on the person's own clock. */
export const NOTE_CLOCK = '09:00';

const DAYS_PER: Readonly<Record<'DAY' | 'WEEK', number>> = { DAY: 1, WEEK: 7 };

/**
 * When a stretch the store sells ends, from a start. Days and weeks are counted in whole days,
 * as the store counts them; months and years by the calendar on the person's clock.
 */
export function afterPeriod(start: Instant, period: StorePeriod, timeZone: string): Instant {
  if (period.unit === 'DAY' || period.unit === 'WEEK') {
    return start + period.count * DAYS_PER[period.unit] * DAY_MS;
  }
  const { date, hour, minute } = localDateTime(start, timeZone);
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const months = period.count * (period.unit === 'YEAR' ? 12 : 1);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  // The 31st into a short month lands on its last day, as the store does.
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const iso = `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(day, lastDay))}`;
  return instantOfLocal(iso, `${pad(hour)}:${pad(minute)}`, timeZone);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** When his note about a charge goes out: two days before the charge's day, at nine. */
export function noteBeforeCharge(chargeAt: Instant, timeZone: string): Instant {
  const chargeDay = localDateTime(chargeAt, timeZone).date;
  return instantOfLocal(addDays(chargeDay, -NOTE_DAYS_BEFORE_CHARGE), NOTE_CLOCK, timeZone);
}

/** The three days a receipt shows before the button: today, his note, and the first charge. */
export interface ChargeDays {
  readonly today: IsoDate;
  readonly note: IsoDate;
  readonly charge: IsoDate;
  readonly chargeAt: Instant;
}

/**
 * The receipt's three days for a free stretch starting now: the store charges when it ends, and
 * his note goes out two days before that.
 */
export function chargeDaysFor(now: Instant, free: StorePeriod, timeZone: string): ChargeDays {
  return chargeDaysAt(now, afterPeriod(now, free, timeZone), timeZone);
}

/** The same three days for a charge the store has already set. */
export function chargeDaysAt(now: Instant, chargeAt: Instant, timeZone: string): ChargeDays {
  return {
    today: localDateTime(now, timeZone).date,
    note: localDateTime(noteBeforeCharge(chargeAt, timeZone), timeZone).date,
    charge: localDateTime(chargeAt, timeZone).date,
    chargeAt,
  };
}

/** A receipt's short date, "3 NOV", with the year when it is not this year's: "27 OCT 2027". */
export function receiptDay(day: IsoDate, today: IsoDate, language: 'en' | 'vi'): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  const at = Date.UTC(year, month - 1, date, 12);
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  })
    .format(at)
    .replace(/\./g, '')
    .toLocaleUpperCase(language);
}

/** A day as he writes it in a note: "Monday 3 November", "Thứ Hai, 3 tháng 11". */
export function noteDay(day: IsoDate, language: 'en' | 'vi'): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(Date.UTC(year, month - 1, date, 12));
}
