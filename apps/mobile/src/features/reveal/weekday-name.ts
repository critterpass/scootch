import type { Language } from '@scootch/i18n';

// The first of January 2024 was a Monday.
const MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

/** The name of a weekday, 1 (Monday) to 7 (Sunday), as the language writes it. */
export function weekdayName(language: Language, position: number, width: 'long' | 'short'): string {
  return new Date(MONDAY + (position - 1) * DAY_MS).toLocaleDateString(language, {
    weekday: width,
    timeZone: 'UTC',
  });
}
