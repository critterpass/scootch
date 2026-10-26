import { normalise, stripMarks } from './text';

/**
 * Dates heard in what the user said, on the phone. `findDueDate` finds the user's phrase for a
 * day in the text; `resolveHeardDate` works out the day it means from the phrase and the user's
 * own today. A phrase that is not a date, or cannot be pinned to one day, gives `null`: a
 * deadline is dropped rather than guessed.
 */
export type HeardDate = {
  /** The user's own words for the date. */
  readonly heardAs: string;
  /**
   * Another reading of it, used only where the phrase allows two days. Empty on the phone, where
   * the rules below choose instead.
   */
  readonly candidate: string;
  /** The whole text the phrase must come from. */
  readonly text: string;
  /** The user's local today, `YYYY-MM-DD`. */
  readonly localDate: string;
  /** How `3/4` reads with no candidate: day first (the default) or month first. */
  readonly dayFirst?: boolean;
};

const dayMs = 86_400_000;
const furthestDays = 366;

function parseIso(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  // A day that does not exist (30 February) rolls over, so it reads back differently.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? time : null;
}

function toIso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

const weekdays: readonly (readonly [RegExp, number])[] = [
  [/\b(sunday|sun)\b|chu nhat|\bcn\b/, 0],
  [/\b(monday|mon)\b|thu (hai|2)\b|\bt2\b/, 1],
  [/\b(tuesday|tues?)\b|thu (ba|3)\b|\bt3\b/, 2],
  [/\b(wednesday|wed)\b|thu (tu|4)\b|\bt4\b/, 3],
  [/\b(thursday|thurs?)\b|thu (nam|5)\b|\bt5\b/, 4],
  [/\b(friday|fri)\b|thu (sau|6)\b|\bt6\b/, 5],
  [/\b(saturday|sat)\b|thu (bay|7)\b|\bt7\b/, 6],
];

const months: readonly RegExp[] = [
  /\bjan(uary)?\b/,
  /\bfeb(ruary)?\b/,
  /\bmar(ch)?\b/,
  /\bapr(il)?\b/,
  /\bmay\b/,
  /\bjune?\b/,
  /\bjuly?\b/,
  /\baug(ust)?\b/,
  /\bsep(t|tember)?\b/,
  /\boct(ober)?\b/,
  /\bnov(ember)?\b/,
  /\bdec(ember)?\b/,
];

const smallNumbers: Readonly<Record<string, number>> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
};

function numberFrom(word: string | undefined): number | null {
  if (word === undefined) return null;
  return /^\d+$/.test(word) ? Number(word) : (smallNumbers[word] ?? null);
}

/** The next day on or after `from` that is day `day` of a month. */
function nextDayOfMonth(from: number, day: number): number | null {
  const start = new Date(from);
  for (let ahead = 0; ahead < 3; ahead += 1) {
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth() + ahead;
    const time = Date.UTC(year, month, day);
    if (new Date(time).getUTCDate() === day && time >= from) return time;
  }
  return null;
}

/** Day and month in the coming twelve months, or in the year the phrase names. */
function dayAndMonth(from: number, day: number, month: number, year: number | null): number | null {
  const thisYear = new Date(from).getUTCFullYear();
  for (const tryYear of year === null ? [thisYear, thisYear + 1] : [year]) {
    const time = parseIso(
      `${tryYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
    if (time !== null && time >= from) return time;
  }
  return null;
}

function lastDayOfMonth(from: number, monthsAhead: number): number {
  const start = new Date(from);
  return Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthsAhead + 1, 0);
}

/** Monday of the week after this one; weeks run Monday to Sunday. */
function nextMonday(today: number): number {
  return today + ((8 - new Date(today).getUTCDay()) % 7 || 7) * dayMs;
}

/** The given weekday in the week after this one. */
function inNextWeek(today: number, weekday: number): number {
  return nextMonday(today) + ((weekday + 6) % 7) * dayMs;
}

function fromWeekday(phrase: string, weekday: number, today: number, candidate: number | null) {
  const ahead = (weekday - new Date(today).getUTCDay() + 7) % 7;
  const coming = today + ahead * dayMs;
  if (/tuan (sau|toi)|\bnext week\b/.test(phrase)) return inNextWeek(today, weekday);
  const next = /\bnext\b/.test(phrase);
  if (candidate === null) {
    // On the phone there is no second reading: "next Friday" is the Friday of next week, and
    // "Friday" said on a Friday is today.
    return next ? inNextWeek(today, weekday) : coming;
  }
  if (next || ahead === 0) {
    // "Next Friday", and "Friday" said on a Friday, can each mean two days: the other reading is
    // kept only when it is one of them.
    const later = coming + 7 * dayMs;
    if (candidate === later) return later;
    return candidate === coming || ahead === 0 ? coming : null;
  }
  return coming;
}

function resolve(
  phrase: string,
  marked: string,
  today: number,
  candidate: number | null,
  dayFirst: boolean,
) {
  const weekday = weekdays.find(([pattern]) => pattern.test(phrase));
  if (weekday !== undefined) return fromWeekday(phrase, weekday[1], today, candidate);

  if (/\bweekend\b|cuoi tuan/.test(phrase)) {
    const toSaturday = (6 - new Date(today).getUTCDay() + 7) % 7;
    const coming = new Date(today).getUTCDay() === 0 ? today : today + toSaturday * dayMs;
    return /\bnext weekend\b|cuoi tuan (sau|toi)/.test(phrase) ? inNextWeek(today, 6) : coming;
  }
  if (/\bend of (the )?day\b|\beod\b/.test(phrase)) return today;
  if (/\bend of (the |this )?week\b/.test(phrase)) {
    return today + ((5 - new Date(today).getUTCDay() + 7) % 7) * dayMs;
  }

  if (/day after tomorrow|ngay kia/.test(phrase) || /(^|\s)(ngày )?mốt(\s|$)/u.test(marked)) {
    return today + 2 * dayMs;
  }
  if (/\btomorrow\b/.test(phrase) || /(^|\s)mai(\s|$)/u.test(marked)) return today + dayMs;
  if (
    /\b(today|tonight|this (morning|afternoon|evening))\b|(hom|toi|chieu|sang|trua) nay/.test(
      phrase,
    )
  ) {
    return today;
  }

  const inSome =
    /\b(?:with)?in (\w+) (day|week)s?\b/.exec(phrase) ??
    /(?:^|\s)(\w+) (ngay|tuan) nua/.exec(phrase);
  if (inSome !== null) {
    const count = numberFrom(inSome[1]);
    const unit = inSome[2] === 'day' || inSome[2] === 'ngay' ? 1 : 7;
    return count === null ? null : today + count * unit * dayMs;
  }

  if (/end of (the |this )?month|cuoi thang( nay)?$/.test(phrase)) return lastDayOfMonth(today, 0);
  if (/end of next month|cuoi thang (sau|toi)/.test(phrase)) return lastDayOfMonth(today, 1);

  const numeric = /(?:^|\D)(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?(?:\D|$)/.exec(phrase);
  if (numeric !== null) {
    const [first, second] = [Number(numeric[1]), Number(numeric[2])];
    const year = numeric[3] === undefined ? null : Number(numeric[3]);
    // 3/4 is the third of April or March the fourth.
    const dayMonth = dayAndMonth(today, first, second, year);
    const monthDay = dayAndMonth(today, second, first, year);
    const readings = [dayMonth, monthDay].filter((time) => time !== null);
    if (new Set(readings).size === 1) return readings[0] ?? null;
    if (candidate === null) return dayFirst ? dayMonth : monthDay;
    return readings.find((time) => time === candidate) ?? null;
  }

  const day = Number(
    (/\b(\d{1,2})(?:st|nd|rd|th)\b/.exec(phrase) ??
      /(?:ngay|mung|mong) (\d{1,2})\b/.exec(phrase) ??
      /\b(\d{1,2}) thang\b/.exec(phrase) ??
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})\b/.exec(marked) ??
      /\b(\d{1,2}) (?:of )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.exec(marked))?.[1],
  );
  const nextMonth = /\bnext month\b|thang (sau|toi)/.test(phrase);
  if (nextMonth && !/\d/.test(phrase)) {
    const start = new Date(today);
    return Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  }
  if (/\bnext week\b|tuan (sau|toi)/.test(phrase) && !/\d/.test(phrase)) return nextMonday(today);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (nextMonth) {
    const start = new Date(today);
    const time = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, day);
    return new Date(time).getUTCDate() === day ? time : null;
  }
  // Month names are read with their marks on: "máy" is not May.
  const named = months.findIndex((pattern) => pattern.test(marked)) + 1;
  const month = named > 0 ? named : Number(/thang (\d{1,2})\b/.exec(phrase)?.[1]);
  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    return dayAndMonth(today, day, month, null);
  }
  return nextDayOfMonth(today, day);
}

/** The day a heard phrase means, `YYYY-MM-DD`, or `null` when it cannot be trusted. */
export function resolveHeardDate({
  heardAs,
  candidate,
  text,
  localDate,
  dayFirst = true,
}: HeardDate): string | null {
  const today = parseIso(localDate);
  const marked = normalise(heardAs).replace(/^[\s.,;:!?"']+|[\s.,;:!?"']+$/g, '');
  if (today === null || marked === '' || !normalise(text).includes(marked)) return null;

  const resolved = resolve(stripMarks(marked), marked, today, parseIso(candidate), dayFirst);
  if (resolved === null || resolved < today || resolved > today + furthestDays * dayMs) return null;
  return toIso(resolved);
}
