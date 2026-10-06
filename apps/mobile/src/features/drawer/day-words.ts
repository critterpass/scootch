import { daysBetween, type IsoDate } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

/**
 * A calendar day in the person's words: the weekday while it is within the week ahead, and the
 * day and month otherwise. The date is a local day already, so it is formatted without a zone.
 */
export function dayWords(date: IsoDate, today: IsoDate, language: Language): string {
  const away = daysBetween(today, date);
  const near = away >= 0 && away < 7;
  const format = new Intl.DateTimeFormat(language, {
    timeZone: 'UTC',
    ...(near ? { weekday: 'long' } : { day: 'numeric', month: 'short' }),
  });
  return format.format(new Date(`${date}T12:00:00.000Z`));
}
