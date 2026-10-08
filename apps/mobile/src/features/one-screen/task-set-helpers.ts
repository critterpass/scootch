import {
  endTime,
  sittingBites,
  type ClockTime,
  type DayMoment,
  type GuessMinutes,
  type Instant,
  type StartCue,
  type TaskRow,
} from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';

import { bitesOf } from '../../state/bites';

/** One bite as its sheet draws it. */
export interface BiteRow {
  /** Where the bite stands among the task's bites: what a tick is sent with. */
  readonly place: number;
  readonly text: string;
  /** `null` for a line the person left themselves: nobody timed it. */
  readonly minutes: number | null;
  readonly ticked: boolean;
  /** True on the bite whose tick opens the catch. */
  readonly opensCatch: boolean;
}

/** The quiet helpers around Start, as the dock draws them. Unset, or with neither, it draws none. */
export interface TaskSetHelpers {
  /** The guess at the whole thing's length; `null` on a task that takes none. */
  readonly guess: {
    readonly minutes: GuessMinutes | null;
    readonly onGuess: (minutes: GuessMinutes) => void;
  } | null;
  /** When the thing is brought back; `null` on a task that takes no cue. */
  readonly when?: {
    /** The cue picked or kept; `null` for now. */
    readonly cue: StartCue | null;
    /** The clock time of each moment of the day, from the settings. */
    readonly moments: Readonly<Record<DayMoment, ClockTime>>;
    /** A cue picked, or `null` for "Now", which takes any cue away. */
    readonly onCue: (cue: StartCue | null) => void;
  } | null;
  /** The task's bites; `null` when it has none. */
  readonly bites: {
    /** The monster's name, or `null` when it has none to show. */
    readonly name: string | null;
    readonly rows: readonly BiteRow[];
    readonly onTick: (place: number) => void;
  } | null;
  /** The sheet standing open from the first frame: a capture's, never the app's. */
  readonly opened?: 'guess' | 'when' | 'bites';
}

/** The guess offered when none was made yet, as the board draws its sheet. */
export const USUAL_GUESS: GuessMinutes = 120;

/**
 * Whether a guess is asked for. A serious task takes none: a guess ends up beside a number on a
 * card, and a serious task has no card. The stored flag decides, whatever was said after it.
 */
export function takesGuess(task: Pick<TaskRow, 'screen'>): boolean {
  return task.screen !== 'serious';
}

/**
 * The task's bites for their sheet, in order, with what is ticked. `null` when there are none to
 * open: no pack yet, a pack without them, or a serious task. The last bite still open is the one
 * that opens the catch; while more than one is open, that is said of the final bite alone.
 */
export function biteRows(task: TaskRow): readonly BiteRow[] | null {
  if (bitesOf(task).length === 0) return null;
  const caught = task.bitesCaught ?? [];
  const bites = sittingBites(task);
  const open = bites.map((_, place) => place).filter((place) => !caught.includes(place));
  const closing = open.length === 1 ? open[0] : bites.length - 1;
  return bites.map((bite, place) => ({
    place,
    text: bite.text,
    minutes: bite.minutes,
    ticked: caught.includes(place),
    opensCatch: place === closing && !caught.includes(place),
  }));
}

export type BitesNote =
  | { readonly key: 'bites.note.first' }
  | { readonly key: 'bites.note.down'; readonly count: number }
  | { readonly key: 'bites.note.opening' };

/** The one line under the bites: where to begin, how many are down, or that the catch is opening. */
export function bitesNote(rows: readonly BiteRow[]): BitesNote {
  const down = rows.filter((row) => row.ticked).length;
  if (down === 0) return { key: 'bites.note.first' };
  if (down >= rows.length) return { key: 'bites.note.opening' };
  return { key: 'bites.note.down', count: down };
}

const GUESS_LABELS = {
  30: 'guess.length.30',
  60: 'guess.length.60',
  120: 'guess.length.120',
  180: 'guess.length.180',
  360: 'guess.length.360',
} as const satisfies Record<GuessMinutes, StringKey>;

/** The label of a guess: "30 min", "2 hours", "Half a day". */
export function guessLabel(minutes: GuessMinutes): (typeof GUESS_LABELS)[GuessMinutes] {
  return GUESS_LABELS[minutes];
}

/** `3:42` for a length started now, on the person's own clock, as the design writes a time. */
export function endsAtClock(now: Instant, minutes: number, timeZone: string): string {
  return endTime(now, minutes, timeZone).clock.replace(/^0(?=\d)/, '');
}
