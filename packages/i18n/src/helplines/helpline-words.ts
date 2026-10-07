import type { Language, StringKey } from '../catalogue-types';
import { t } from '../translate';

import { minutesOf } from './helpline-rules';
import type { Helpline, HelplineHours, HelplineTimeZone, Weekday } from './helpline-table';

const DAY_KEYS = [
  'care.day.sun',
  'care.day.mon',
  'care.day.tue',
  'care.day.wed',
  'care.day.thu',
  'care.day.fri',
  'care.day.sat',
] as const satisfies readonly StringKey[];

const ZONE_KEYS = {
  'Asia/Ho_Chi_Minh': 'care.helpline.zone.vietnam',
} as const satisfies Record<HelplineTimeZone, StringKey>;

/** A time of day as each language writes it: "8:30 pm" in English, "20:30" in Vietnamese. */
function timeWords(language: Language, time: string): string {
  if (language === 'vi') return time;
  const minutes = minutesOf(time);
  const hour = Math.floor(minutes / 60);
  const past = minutes % 60;
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}${past === 0 ? '' : `:${String(past).padStart(2, '0')}`} ${hour < 12 ? 'am' : 'pm'}`;
}

/** The days a line answers: every day, a run of days ("Wed to Sun") or a list of them. */
function dayWords(language: Language, days: readonly Weekday[]): string {
  const name = (day: Weekday) => t(language, DAY_KEYS[day]);
  const first = days[0];
  const last = days[days.length - 1];
  if (first === undefined || last === undefined) return '';
  if (new Set(days).size === 7) return t(language, 'care.helpline.hours.everyDay');
  const isRun = days.every((day, index) => index === 0 || day === ((days[index - 1] ?? 0) + 1) % 7);
  if (isRun && days.length > 2) {
    return t(language, 'care.helpline.hours.dayRange', { first: name(first), last: name(last) });
  }
  return days.map(name).join(', ');
}

/** A line's opening hours in plain words, with the time zone they are told in. */
export function hoursWords(language: Language, hours: HelplineHours): string {
  if (hours.kind === 'always') return t(language, 'care.helpline.hours.always');
  return t(language, 'care.helpline.hours.weekly', {
    days: dayWords(language, hours.days),
    from: timeWords(language, hours.from),
    to: timeWords(language, hours.to),
    zone: t(language, ZONE_KEYS[hours.timeZone]),
  });
}

/**
 * The words under a line wherever it is shown: who it is for when that is not everyone, and its
 * hours. A line that is closed says so first, and still gives its hours.
 */
export function helplineDetail(
  language: Language,
  line: Pick<Helpline, 'hours' | 'audience'>,
  open: boolean,
): string {
  const hours = hoursWords(language, line.hours);
  return [
    line.audience === 'children' ? t(language, 'care.helpline.forChildren') : null,
    open ? hours : t(language, 'care.helpline.closedNow', { hours }),
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
