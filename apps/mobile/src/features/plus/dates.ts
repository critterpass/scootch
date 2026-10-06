import type { Instant } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

/** A store date as the person reads it: "13 October 2027", in their zone and language. */
export function longDate(instant: Instant, language: Language, timeZone: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(instant);
}

/** A near store date with its weekday: "Tue 13 Oct". */
export function shortDay(instant: Instant, language: Language, timeZone: string): string {
  return new Intl.DateTimeFormat(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(instant);
}
