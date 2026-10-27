import {
  daysBetween,
  heardTimeOn,
  isFrontRow,
  talliesOf,
  type IsoDate,
  type Moment,
  type Ranked,
} from '@phusclass/domain/board';
import type { Language } from '@phusclass/i18n';

/** What is chalked in a row's corner. */
export type RowMark =
  /** Late slips, one stroke each; from the fifth they are struck through. */
  | { readonly kind: 'tally'; readonly count: number; readonly frontRow: boolean }
  /** A date or a time heard for the task. */
  | { readonly kind: 'date'; readonly label: string }
  | { readonly kind: 'none' };

/** One task as the board draws it. */
export interface BoardRow {
  readonly id: string;
  readonly text: string;
  /** The task on the desk: the red dot. */
  readonly onDesk: boolean;
  /** Today's: the desk's task, or one due or timed today. Underlined. */
  readonly today: boolean;
  readonly mark: RowMark;
  /** Old chalk: undated and untouched for two weeks. */
  readonly faded: boolean;
  /** Serious or crisis: no tally, no front row, no line about it. */
  readonly heavy: boolean;
  /** Screened by the care screen; until then he says nothing pointed about it. */
  readonly screened: boolean;
}

/** The interface words a row's corner may need. */
export interface RowWords {
  readonly today: string;
}

/** What the day's care allows on the board's rows. */
export interface RowCare {
  /** Tally marks and the front-row tag; off in plain company after a crisis. */
  readonly pressure: boolean;
}

/** A locale for the dates on the board, in the app's language rather than the phone's. */
export function dateLocale(language: Language): string {
  return language === 'vi' ? 'vi-VN' : 'en-GB';
}

function utc(day: IsoDate): Date {
  return new Date(`${day}T12:00:00Z`);
}

/**
 * A due date as the board's corner writes it: today, a weekday within the week, otherwise the day
 * and month.
 */
export function dueLabel(
  day: IsoDate,
  today: IsoDate,
  language: Language,
  words: RowWords,
): string {
  const ahead = daysBetween(today, day);
  if (ahead === 0) return words.today;
  const locale = dateLocale(language);
  if (ahead > 0 && ahead < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(utc(day));
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(utc(day));
}

/** The date in the board's top corner: "Monday 26". */
export function boardDateLine(today: IsoDate, language: Language): string {
  return new Intl.DateTimeFormat(dateLocale(language), {
    weekday: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(utc(today));
}

/**
 * The board's rows, in his order, as the store gives them. A serious or crisis task never carries
 * tally marks or the front-row tag, and in plain company after a crisis no task does: the store's
 * flag and the care view decide, nothing is worked out again here.
 */
export function boardRows(
  board: readonly Ranked[],
  faded: ReadonlySet<string>,
  now: Pick<Moment, 'day'>,
  language: Language,
  words: RowWords,
  care: RowCare = { pressure: true },
): BoardRow[] {
  return board.map(({ task, reason }) => {
    const heavy = task.care !== 'none';
    const tallies = heavy || !care.pressure ? 0 : talliesOf(task);
    const time = heardTimeOn(task, now.day);
    const mark: RowMark =
      tallies > 0
        ? { kind: 'tally', count: tallies, frontRow: isFrontRow(task) }
        : time !== null
          ? { kind: 'date', label: time }
          : task.dueDate !== null
            ? { kind: 'date', label: dueLabel(task.dueDate, now.day, language, words) }
            : { kind: 'none' };
    const onDesk = task.status === 'desk';
    return {
      id: task.id,
      text: task.text,
      onDesk,
      today: onDesk || reason === 'due today' || task.dueDate === now.day || time !== null,
      mark,
      faded: faded.has(task.id),
      heavy,
      screened: task.screened,
    };
  });
}
