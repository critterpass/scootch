import { DAY_ROLLOVER_HOUR, localDateTime } from '@scootch/domain';
import { normalise, stripMarks } from '@scootch/voice';

import { resolveHeardDate } from './deadlines';

/**
 * Clock times heard in a ramble, for today. As with dates, the model only points at the user's
 * phrase; the time on the clock is worked out here from the phrase and the user's own clock. An
 * hour said without its half of the day ("at 3") is the next such hour still ahead today. A
 * phrase that is not in the text, is not a clock time, or has already gone by gives `null`: a
 * heard time is dropped rather than guessed.
 */
export type HeardClock = {
  /** The user's own words for the time, as the model quoted them. */
  readonly heardAs: string;
  /** The whole text the phrase must come from. */
  readonly text: string;
  /** Minutes since midnight on the user's wall clock, now. */
  readonly nowMinutes: number;
};

const dayMinutes = 24 * 60;
/** The small hours before this belong to the day before, and no bare hour is ever read as one. */
const rolloverMinutes = DAY_ROLLOVER_HOUR * 60;

const enNumbers: Readonly<Record<string, number>> = {
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
  eleven: 11,
  twelve: 12,
};
/** Vietnamese numbers with their marks: without them "sau" is as much "after" as it is six. */
const viNumbers: Readonly<Record<string, number>> = {
  một: 1,
  hai: 2,
  ba: 3,
  bốn: 4,
  năm: 5,
  sáu: 6,
  bảy: 7,
  tám: 8,
  chín: 9,
  mười: 10,
  'mười một': 11,
  'mười hai': 12,
};
const viNumbersBare: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(viNumbers).map(([word, value]) => [stripMarks(word), value]),
);

/** Longest first, so "mười một" is not read as "mười". */
function oneOf(words: Readonly<Record<string, number>>): string {
  return Object.keys(words)
    .sort((a, b) => b.length - a.length)
    .join('|');
}

type Half = 'am' | 'pm' | 'midday' | 'night' | null;
type Said = { readonly hour: number; readonly minute: number };

function english(phrase: string): Said | null {
  const number = `\\d{1,2}|${oneOf(enNumbers)}`;
  const valueOf = (word: string | undefined) =>
    word === undefined ? NaN : /^\d+$/.test(word) ? Number(word) : (enNumbers[word] ?? NaN);

  if (/\b(noon|midday)\b/.test(phrase)) return { hour: 12, minute: 0 };
  const half = new RegExp(`\\bhalf (?:past )?(${number})\\b`).exec(phrase);
  if (half !== null) return { hour: valueOf(half[1]), minute: 30 };
  const quarter = new RegExp(`\\b(?:a )?quarter (past|to) (${number})\\b`).exec(phrase);
  if (quarter !== null) {
    const hour = valueOf(quarter[2]);
    return quarter[1] === 'past' ? { hour, minute: 15 } : { hour: hour - 1, minute: 45 };
  }
  const digits = /(?<![\d/.-])(\d{1,2})(?:[:.](\d{2}))(?![\d/])/.exec(phrase);
  if (digits !== null) return { hour: Number(digits[1]), minute: Number(digits[2]) };
  const marked = new RegExp(`\\b(${number})\\s*(?:[ap]\\.?m\\b|o'?clock\\b)`).exec(phrase);
  if (marked !== null) return { hour: valueOf(marked[1]), minute: 0 };
  const spoken = new RegExp(`\\b(${oneOf(enNumbers)}) (thirty|fifteen|forty[- ]five)\\b`).exec(
    phrase,
  );
  if (spoken !== null) {
    const minute = spoken[2] === 'thirty' ? 30 : spoken[2] === 'fifteen' ? 15 : 45;
    return { hour: valueOf(spoken[1]), minute };
  }
  const bare = new RegExp(
    `\\b(?:at|by|around|about|for|before|until|till?)\\s+(?:about |around )?(${number})\\b(?!\\s*(?:minutes?|mins?|hours?|days?|weeks?|months?|%))`,
  ).exec(phrase);
  return bare === null ? null : { hour: valueOf(bare[1]), minute: 0 };
}

function vietnamese(phrase: string, numbers: Readonly<Record<string, number>>): Said | null {
  const number = `\\d{1,2}|${oneOf(numbers)}`;
  const valueOf = (word: string | undefined) =>
    word === undefined ? NaN : /^\d+$/.test(word) ? Number(word) : (numbers[word] ?? NaN);
  const start = '(?<![\\p{L}\\p{N}])';
  const end = '(?![\\p{L}\\p{N}])';

  const less = new RegExp(
    `${start}(${number})\\s*(?:giờ|gio|h|g)\\s*(?:kém|kem)\\s*(${number})${end}`,
    'u',
  ).exec(phrase);
  if (less !== null) {
    const minutes = valueOf(less[1]) * 60 - valueOf(less[2]);
    return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
  }
  const halfPast = new RegExp(
    `${start}(${number})\\s*(?:giờ|gio|h|g)?\\s*(?:rưỡi|ruoi)${end}`,
    'u',
  ).exec(phrase);
  if (halfPast !== null) return { hour: valueOf(halfPast[1]), minute: 30 };
  const hour = new RegExp(
    `${start}(${number})\\s*(?:giờ|gio|h|g)(?:\\s*(\\d{1,2})(?:\\s*(?:phút|phut|p))?)?${end}`,
    'u',
  ).exec(phrase);
  if (hour !== null) {
    return { hour: valueOf(hour[1]), minute: hour[2] === undefined ? 0 : Number(hour[2]) };
  }
  const bare = new RegExp(`${start}(?:lúc|luc)\\s+(\\d{1,2})${end}(?!\\s*[/.-]\\d)`, 'u').exec(
    phrase,
  );
  return bare === null ? null : { hour: Number(bare[1]), minute: 0 };
}

/** Which half of the day the phrase names, when it names one. */
function halfOf(phrase: string, unmarked: boolean): Half {
  if (/\d\s*a\.?m\b|\b(in the|this) morning\b/.test(phrase)) return 'am';
  if (/\d\s*p\.?m\b|\b(afternoon|evening|tonight)\b|\bat night\b/.test(phrase)) return 'pm';
  // Typed without its marks, "toi" is "I" as often as it is the evening, so it names nothing.
  if (/(?<![\p{L}])sáng(?![\p{L}])/u.test(phrase) || (unmarked && /\bsang\b/.test(phrase))) {
    return 'am';
  }
  if (/(?<![\p{L}])trưa(?![\p{L}])/u.test(phrase) || (unmarked && /\btrua\b/.test(phrase))) {
    return 'midday';
  }
  if (
    /(?<![\p{L}])(chiều|tối)(?![\p{L}])/u.test(phrase) ||
    (unmarked && /\bchieu\b/.test(phrase))
  ) {
    return 'pm';
  }
  if (/(?<![\p{L}])(đêm|khuya)(?![\p{L}])/u.test(phrase) || (unmarked && /\bdem\b/.test(phrase))) {
    return 'night';
  }
  return null;
}

/** The hours on a 24-hour clock that a said hour can mean, soonest in the day first. */
function hoursFor(hour: number, half: Half): number[] {
  // A 24-hour time says its own half of the day.
  if (hour > 12 || hour === 0) return [hour];
  const [early, late] = [hour % 12, (hour % 12) + 12];
  if (half === 'am') return [early];
  if (half === 'pm') return [late];
  if (half === 'midday') return [hour >= 10 ? hour : late];
  // Twelve at night is midnight; nine to eleven are the evening; the rest are the small hours.
  if (half === 'night') return [hour === 12 ? 0 : hour >= 9 ? late : early];
  return [early, late].filter((one) => one * 60 >= rolloverMinutes);
}

/** Minutes into the Scootch day: the small hours come after the evening, not before the morning. */
function intoDay(minutes: number): number {
  return minutes < rolloverMinutes ? minutes + dayMinutes : minutes;
}

/** The clock time a heard phrase means today, `HH:mm`, or `null` when it cannot be trusted. */
export function resolveHeardTime({ heardAs, text, nowMinutes }: HeardClock): string | null {
  const marked = normalise(heardAs).replace(/^[\s.,;:!?"']+|[\s.,;:!?"']+$/g, '');
  if (marked === '' || !normalise(text).includes(marked)) return null;
  if (!Number.isInteger(nowMinutes) || nowMinutes < 0 || nowMinutes >= dayMinutes) return null;

  const unmarked = stripMarks(marked) === marked;
  const said =
    vietnamese(marked, viNumbers) ??
    (unmarked ? vietnamese(marked, viNumbersBare) : null) ??
    english(marked);
  if (said === null) return null;
  const { hour, minute } = said;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const now = intoDay(nowMinutes);
  const ahead = hoursFor(hour, halfOf(marked, unmarked))
    .map((one) => one * 60 + minute)
    .filter((minutes) => intoDay(minutes) > now)
    .sort((a, b) => intoDay(a) - intoDay(b))[0];
  if (ahead === undefined) return null;
  return `${String(Math.floor(ahead / 60)).padStart(2, '0')}:${String(ahead % 60).padStart(2, '0')}`;
}

/** A word for a day that may not be today. "Sat", "sun" and unmarked "mot" are ordinary words. */
const anotherDayWords =
  /\b(tomorrow|next (week|month|mon|tue|wed|thu|fri|sat|sun)\w*|(mon|tues|wednes|thurs|fri|satur|sun)day|(mon|tues?|wed|thur?s?|fri)|on the \d{1,2}(st|nd|rd|th)|\d{1,2}(st|nd|rd|th) of)\b|\d{1,2}\/\d{1,2}|(?<![\p{L}])(mai|mốt|ngày kia|ngay kia|tuần (sau|tới)|tuan (sau|toi)|tháng (sau|tới)|thang (sau|toi)|thứ (hai|ba|tư|năm|sáu|bảy|[2-7])|thu (hai|ba|tu|nam|sau|bay|[2-7])|chủ nhật|chu nhat|ngày \d{1,2}|ngay \d{1,2}|mùng \d{1,2}|mung \d{1,2})(?![\p{L}])/u;

/** Where one thing said in a ramble ends and the next begins. */
const clauseBreak = /[.,;!?\n]|\s(?:and|then|also|plus|và|với|rồi|còn)\s/gu;

/**
 * Whether the part of the text a time sits in names a day that is not today: "dentist at 3 on
 * Friday" is a deadline for Friday and never a time heard for today.
 */
export function namesAnotherDay(heardAs: string, text: string, localDate: string): boolean {
  const source = normalise(text);
  const phrase = normalise(heardAs);
  const at = source.indexOf(phrase);
  if (at < 0) return false;
  let [opens, closes] = [0, source.length];
  for (const found of source.matchAll(clauseBreak)) {
    if (found.index + found[0].length <= at) opens = found.index + found[0].length;
    else if (found.index >= at + phrase.length) {
      closes = found.index;
      break;
    }
  }
  const clause = source.slice(opens, closes).trim();
  if (!anotherDayWords.test(clause)) return false;
  // A day word that works out to today ("Tuesday at 3", said on a Tuesday) is still today.
  return resolveHeardDate({ heardAs: clause, candidate: '', text, localDate }) !== localDate;
}

/**
 * Now on the user's wall clock, in minutes since midnight: the clock the phone sent, or the
 * server's own read in the user's zone. `null` when neither can be read.
 */
export function wallClockMinutes(
  localTime: string | undefined,
  timeZone: string,
  now: number = Date.now(),
): number | null {
  if (localTime !== undefined) {
    const [hour = NaN, minute = NaN] = localTime.split(':').map(Number);
    return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : null;
  }
  try {
    const local = localDateTime(now, timeZone);
    return local.hour * 60 + local.minute;
  } catch {
    // A zone the runtime does not know: there is no clock to read a time against.
    return null;
  }
}
