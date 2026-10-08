/**
 * Helplines by country: the one table the app and the website both read.
 *
 * EVERY NUMBER AND EVERY OPENING HOUR HERE IS VERIFIED AGAINST THE SERVICE'S OWN SITE, and again
 * every month after. `checkedOn` is the day a person last did that; `null` means nobody has yet,
 * and neither the app nor the site may go to production while any row says so (the release check
 * in `tools/scripts/check-helplines-verified.ts` refuses). Add no row and change no digit without
 * its source open in front of you. Nothing in this file is ever logged.
 */

/** A day of the week as `Date#getUTCDay` numbers it: 0 is Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The time zones a line's hours are written in. Each one never changes its clocks. */
export type HelplineTimeZone = 'Asia/Ho_Chi_Minh';

/** Minutes ahead of UTC, all year round. A zone with summer time cannot be listed this way. */
export const ZONE_OFFSET_MINUTES: Readonly<Record<HelplineTimeZone, number>> = {
  'Asia/Ho_Chi_Minh': 7 * 60,
};

export type HelplineHours =
  | { readonly kind: 'always' }
  | {
      readonly kind: 'weekly';
      /** The days the line answers, in its own time zone. */
      readonly days: readonly Weekday[];
      /** `HH:MM` on the 24-hour clock, in the line's own time zone. Open from `from` up to `to`. */
      readonly from: string;
      readonly to: string;
      readonly timeZone: HelplineTimeZone;
      /** The day these hours were last read on the service's own site, or `null`. */
      readonly checkedOn: string | null;
    };

export interface Helpline {
  /** ISO 3166-1 alpha-2 codes of the regions this row is shown in. */
  readonly regions: readonly string[];
  /** The service's own name, left as the service writes it in every language. Empty for `emergency`. */
  readonly name: string;
  readonly number: string;
  /** A second number that takes texts, where the service has one. */
  readonly textNumber?: string;
  /** `emergency` is the country's medical emergency number. */
  readonly reach: 'call' | 'call_or_text' | 'emergency';
  readonly hours: HelplineHours;
  /** Who the line is for, when it is not for everyone. */
  readonly audience?: 'children';
  /** The service's own site, where the number and hours are checked; an emergency number has none. */
  readonly source: string;
  /** `YYYY-MM-DD`, or `null` while the row is unverified. */
  readonly checkedOn: string | null;
}

/** A directory of free, confidential helplines in every country: the safe default. */
export const HELPLINE_DIRECTORY = 'https://findahelpline.com';

const ALWAYS = { kind: 'always' } as const;
const CHECKED = '2026-10-07';
/** The day the founder read the two rows that had stayed open at their own sources. */
const CHECKED_LATER = '2026-10-08';

export const HELPLINES: readonly Helpline[] = [
  {
    regions: ['US'],
    name: '988 Suicide & Crisis Lifeline',
    number: '988',
    reach: 'call_or_text',
    hours: ALWAYS,
    source: 'https://988lifeline.org',
    checkedOn: CHECKED,
  },
  {
    regions: ['CA'],
    name: '9-8-8 Suicide Crisis Helpline',
    number: '988',
    reach: 'call_or_text',
    hours: ALWAYS,
    source: 'https://988.ca',
    checkedOn: CHECKED,
  },
  {
    regions: ['GB', 'IE'],
    name: 'Samaritans',
    number: '116 123',
    reach: 'call',
    hours: ALWAYS,
    source: 'https://www.samaritans.org',
    checkedOn: CHECKED,
  },
  {
    regions: ['AU'],
    name: 'Lifeline',
    number: '13 11 14',
    textNumber: '0477 13 11 14',
    reach: 'call',
    hours: ALWAYS,
    source: 'https://www.lifeline.org.au',
    checkedOn: CHECKED,
  },
  {
    regions: ['NZ'],
    name: 'Need to talk?',
    number: '1737',
    reach: 'call_or_text',
    hours: ALWAYS,
    source: 'https://1737.org.nz',
    checkedOn: CHECKED,
  },
  {
    regions: ['IN'],
    name: 'Tele-MANAS',
    number: '14416',
    reach: 'call',
    hours: ALWAYS,
    source: 'https://telemanas.mohfw.gov.in',
    checkedOn: CHECKED_LATER,
  },
  {
    // The national medical emergency number. It has no site of its own to name as a source.
    regions: ['VN'],
    name: '',
    number: '115',
    reach: 'emergency',
    hours: ALWAYS,
    source: 'Vietnam national emergency number',
    checkedOn: CHECKED,
  },
  {
    regions: ['VN'],
    name: 'Đường dây nóng Ngày mai',
    number: '096 306 1414',
    reach: 'call',
    hours: {
      kind: 'weekly',
      days: [3, 4, 5, 6, 0],
      from: '13:00',
      to: '20:30',
      timeZone: 'Asia/Ho_Chi_Minh',
      checkedOn: CHECKED,
    },
    source: 'https://duongdaynongngaymai.vn',
    checkedOn: CHECKED,
  },
  {
    regions: ['VN'],
    name: 'Hy Vọng Sống (HOPE)',
    number: '086 50 444 00',
    reach: 'call',
    hours: {
      kind: 'weekly',
      days: [0, 1, 2, 3, 4, 5, 6],
      from: '16:30',
      to: '20:30',
      timeZone: 'Asia/Ho_Chi_Minh',
      checkedOn: CHECKED_LATER,
    },
    source: 'https://hyvongsong.com',
    checkedOn: CHECKED,
  },
  {
    // The national child protection line: for children and the people caring for them. Vietnam
    // has no line for adults that is open around the clock.
    regions: ['VN'],
    name: 'Tổng đài 111',
    number: '111',
    reach: 'call',
    hours: ALWAYS,
    audience: 'children',
    source: 'https://tongdai111.vn',
    checkedOn: CHECKED,
  },
];

/** The rows for a region code as the phone reports it. An unknown region has none: the directory. */
export function helplinesFor(region: string | null | undefined): readonly Helpline[] {
  const code = region?.trim().toUpperCase();
  if (!code) return [];
  return HELPLINES.filter((line) => line.regions.includes(code));
}
