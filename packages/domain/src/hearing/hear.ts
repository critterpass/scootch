import { findDueDate } from './find-date';
import { findTimeToday } from './heard-times';
import { cleanTask, splitRamble } from './split';
import { tidy } from './text';

/** One task heard in a ramble, ready for the board. */
export type HeardTask = {
  /** The task in the user's words, with the date and time phrases and "I need to" taken off. */
  readonly text: string;
  /** The part of the ramble it came from, as said. */
  readonly said: string;
  /** `YYYY-MM-DD`, or `null` when no day was said. */
  readonly dueDate: string | null;
  readonly dateHeardAs: string | null;
  /** A time still ahead today, or `null`. Never set when the part names another day. */
  readonly heardTime: { readonly at: string; readonly heardAs: string } | null;
};

export type Hearing = {
  readonly tasks: readonly HeardTask[];
  /** `split`: cut where tasks start. `sentences`: nothing looked like a task; one per sentence. */
  readonly how: 'split' | 'sentences';
};

export type HearingClock = {
  /** The user's local today, `YYYY-MM-DD`. */
  readonly today: string;
  /** Minutes since midnight on the user's wall clock. */
  readonly nowMinutes: number;
  /** How `3/4` reads: day first unless the user's region writes the month first. */
  readonly dayFirst?: boolean;
};

/** Words that only pointed at the date or time, left hanging once it is taken out. */
const hanging =
  /(?:^|\s)(?:by|on|at|before|until|till|due|for|from|lúc|vào|trước|hạn|đến|tới|luc|vao|truoc|han|den)$/iu;

type Range = { readonly start: number; readonly end: number };

/** Overlapping ranges as one: "tối nay" and "tối nay 8 giờ" are taken out together. */
function merged(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: Range[] = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && range.start <= last.end) {
      out[out.length - 1] = { start: last.start, end: Math.max(last.end, range.end) };
    } else out.push(range);
  }
  return out;
}

function without(said: string, ranges: readonly Range[]): string {
  let text = said;
  for (const { start, end } of merged(ranges).reverse()) {
    const before = text.slice(0, start).trimEnd().replace(hanging, '');
    text = `${before} ${text.slice(end)}`;
  }
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

/** One part of a ramble read as a task: its due date, its time today, and its words. */
export function hearTask(part: string, clock: HearingClock): HeardTask {
  const said = tidy(part);
  const due = findDueDate(said, { today: clock.today, dayFirst: clock.dayFirst ?? true });
  const time = findTimeToday(said, { today: clock.today, nowMinutes: clock.nowMinutes });
  // A time today makes no sense with a later due date; the date wins.
  const keptTime = time !== null && (due === null || due.date === clock.today) ? time : null;
  const ranges = [...(due === null ? [] : [due]), ...(keptTime === null ? [] : [keptTime])];
  const trimmed = cleanTask(without(said, ranges));
  return {
    text: trimmed === '' ? cleanTask(said) || said : trimmed,
    said,
    dueDate: due?.date ?? null,
    dateHeardAs: due?.heardAs ?? null,
    heardTime: keptTime === null ? null : { at: keptTime.at, heardAs: keptTime.heardAs },
  };
}

/**
 * Hears a ramble on the phone, with no connection: splits it into tasks and reads each one's
 * day and time. A ramble is never lost; when nothing in it looks like a task, every sentence
 * lands on the board as said.
 */
export function hear(ramble: string, clock: HearingClock): Hearing {
  const { parts, how } = splitRamble(ramble);
  return { tasks: parts.map((part) => hearTask(part, clock)), how };
}
