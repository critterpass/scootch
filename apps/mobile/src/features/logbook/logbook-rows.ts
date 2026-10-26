import {
  daysBetween,
  type CommentStep,
  type IsoDate,
  type LogbookEntry,
} from '@phusclass/domain/board';
import type { Language } from '@phusclass/i18n';

import { dateLocale } from '../board/board-rows';

/** One line of the sổ đầu bài. No totals, no averages: each line stands alone. */
export interface LogbookRow {
  readonly id: string;
  /** The day, written in the margin on the first line of each day only. */
  readonly day: string | null;
  readonly text: string;
  /** The period, or how it left the board. */
  readonly detail: string;
  /** His comment rung; null where there is nothing to sign (a heavy task, a tick). */
  readonly comment: CommentStep | null;
}

export interface LogbookWords {
  readonly minutes: (minutes: number) => string;
  readonly ticked: string;
  readonly certificate: string;
}

function utc(day: IsoDate): Date {
  return new Date(`${day}T12:00:00Z`);
}

/** The margin's date: a weekday within the last week, otherwise the day and month. */
export function marginDay(day: IsoDate, today: IsoDate, language: Language): string {
  const ago = daysBetween(day, today);
  const locale = dateLocale(language);
  if (ago >= 0 && ago < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(utc(day));
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(utc(day));
}

/** The ISO week of a day: the page's corner says which week of the school year it is. */
export function isoWeek(day: IsoDate): number {
  const date = utc(day);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/** The logbook's lines, newest first as the store keeps them. */
export function logbookRows(
  entries: readonly LogbookEntry[],
  today: IsoDate,
  language: Language,
  words: LogbookWords,
): LogbookRow[] {
  let lastDay: IsoDate | null = null;
  return entries.map((entry) => {
    const day = entry.day === lastDay ? null : marginDay(entry.day, today, language);
    lastDay = entry.day;
    return {
      id: entry.taskId,
      day,
      text: entry.text,
      detail: entry.giayKhen
        ? words.certificate
        : entry.periodMinutes === null
          ? words.ticked
          : words.minutes(entry.periodMinutes),
      comment: entry.comment,
    };
  });
}
