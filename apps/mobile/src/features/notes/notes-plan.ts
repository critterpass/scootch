import { DAY_MS, MINUTE_MS, type Moment, type Task } from '@phusclass/domain/board';
import {
  chooseIndex,
  fillLine,
  linePacks,
  type ClassLanguage,
  type Moment as LineMoment,
} from '@phusclass/voice/class';

/** Quiet hours, in minutes after midnight on the wall clock. `from` may be after `to` (overnight). */
export interface QuietHours {
  readonly from: number;
  readonly to: number;
}

export const DEFAULT_QUIET: QuietHours = { from: 22 * 60, to: 7 * 60 };

/** The three times of day a note may go home: late morning, mid afternoon, early evening. */
export const NOTE_SLOTS: readonly number[] = [10 * 60, 14 * 60 + 30, 19 * 60];

/**
 * How many notes each day gets, counted from the last day the app was opened. Ignored days turn
 * him down, then to silence: a teacher does not chase a student home.
 */
export const NOTES_BY_DAY: readonly number[] = [3, 2, 1];

/** The note's step, its line and the face he wears for it. */
const STEPS = [
  { moment: 'noteHome1', face: 'over' },
  { moment: 'noteHome2', face: 'crossed' },
  { moment: 'noteHome3', face: 'ruler' },
] as const satisfies readonly { moment: LineMoment; face: string }[];

export type NoteFace = (typeof STEPS)[number]['face'];

export interface PlannedNote {
  /** Stable for a day and a step, so planning again replaces the same note. */
  readonly id: string;
  readonly at: number;
  /** 1, 2 or 3: each more pressing than the last. */
  readonly step: 1 | 2 | 3;
  readonly face: NoteFace;
  readonly body: string;
  readonly taskId: string;
  /** Only the last note of a day, and only when the person allowed it through Focus. */
  readonly timeSensitive: boolean;
}

export interface NotesInput {
  readonly now: Moment;
  readonly enabled: boolean;
  readonly quiet: QuietHours;
  /** Let the day's last note through Focus as time-sensitive. */
  readonly timeSensitive: boolean;
  readonly language: ClassLanguage;
  /** The task on the desk, or null. */
  readonly desk: Pick<Task, 'id' | 'text' | 'care' | 'screened'> | null;
  /** Something heavy today, or a crisis day. */
  readonly heavyToday: boolean;
  /** Care allows the act today (not plain company, not serious, not crisis). */
  readonly careAllows: boolean;
  /** The full name from roll call, for `{NAME}`; null leaves out the lines that shout it. */
  readonly fullName: string | null;
}

export function inQuietHours(minute: number, quiet: QuietHours): boolean {
  if (quiet.from === quiet.to) return false;
  return quiet.from < quiet.to
    ? minute >= quiet.from && minute < quiet.to
    : minute >= quiet.from || minute < quiet.to;
}

/** A line for the step, from the offline pack, about the task. */
function lineFor(input: NotesInput, step: 1 | 2 | 3, seed: string, task: string): string | null {
  const moment = STEPS[step - 1]?.moment ?? 'noteHome1';
  const variants: readonly string[] = linePacks[input.language][moment];
  const usable = variants.filter((line) => input.fullName !== null || !line.includes('{NAME}'));
  const line = usable[chooseIndex(usable.length, moment, seed)];
  if (line === undefined) return null;
  return fillLine(line, { task, ...(input.fullName === null ? {} : { NAME: input.fullName }) });
}

/**
 * Today's notes and the next two days', as the person would get them if the app is not opened
 * again: three, then two, then one, then none. Planned again every time the app is opened or the
 * desk changes, so an opened app always starts again from three.
 *
 * No note goes out in quiet hours, on a heavy day, about a heavy task, about a task the screen has
 * not cleared, or while care holds the act. A note is only ever about the task on the desk.
 */
export function planNotes(input: NotesInput): PlannedNote[] {
  const { now, desk } = input;
  if (!input.enabled || desk === null) return [];
  if (desk.care !== 'none' || !desk.screened) return [];
  // Midnight on the wall clock today.
  const midnight = now.at - now.minuteOfDay * MINUTE_MS - (now.at % MINUTE_MS);
  const planned: PlannedNote[] = [];
  NOTES_BY_DAY.forEach((count, day) => {
    if (day === 0 && (input.heavyToday || !input.careAllows)) return;
    const slots = NOTE_SLOTS.slice(0, count);
    slots.forEach((minute, index) => {
      const at = midnight + day * DAY_MS + minute * MINUTE_MS;
      if (at <= now.at + MINUTE_MS || inQuietHours(minute, input.quiet)) return;
      const step = (index + 1) as 1 | 2 | 3;
      const id = `note-home-${day}-${step}`;
      const body = lineFor(input, step, `${desk.id}:${day}:${step}`, desk.text);
      if (body === null) return;
      planned.push({
        id,
        at,
        step,
        face: STEPS[index]?.face ?? 'over',
        body,
        taskId: desk.id,
        timeSensitive: input.timeSensitive && step === count && count === 3,
      });
    });
  });
  return planned;
}
