import {
  backAround,
  cueClock,
  cuePlaceholder,
  dayMomentTimes,
  type Attitude,
  type ClockTime,
  type DayMoment,
  type DayNotification,
  type Instant,
  type IsoDate,
  type SessionLinePack,
  type SettingsRow,
  type StartCue,
  type StoredSessionLines,
  type TaskRow,
  type TimedNotification,
  type TodayState,
} from '@scootch/domain';
import { t, type Language, type StringKey } from '@scootch/i18n';
import { helperLine } from '@scootch/voice';

import type { Repositories } from '../data/repositories';

import type { DayContext } from './day-types';

const MOMENT_LABELS = {
  coffee: 'when.moment.coffee',
  lunch: 'when.moment.lunch',
  work: 'when.moment.work',
  dinner: 'when.moment.dinner',
  bed: 'when.moment.bed',
} as const satisfies Record<DayMoment, StringKey>;

/** The label of a day moment: "After lunch", "Before bed". */
export function momentLabel(moment: DayMoment): (typeof MOMENT_LABELS)[DayMoment] {
  return MOMENT_LABELS[moment];
}

/** A cue in the interface's own words, as the opening of a sentence: "After lunch", "At 15:30". */
export function cueSaid(language: Language, cue: StartCue): string {
  return cue.kind === 'moment'
    ? t(language, momentLabel(cue.moment))
    : t(language, 'when.atTime.said', { clock: cue.at });
}

/** Today's thing while a cue may still be kept for it: set, and not yet begun. */
function waitingTask(today: TodayState): TaskRow | null {
  const waits = today.kind === 'task_set' || (today.kind === 'serious' && today.session === null);
  return waits && today.task.status === 'set' ? today.task : null;
}

/**
 * "Save for later": the cue is kept with today's thing, which stays set. The day's plan is read
 * again from storage, and that is where its one message comes from; a later cue replaces this one.
 */
export async function cueSaved(ctx: DayContext, cue: StartCue, minutes?: number): Promise<void> {
  const task = waitingTask(ctx.memory.state.today);
  if (task === null) return;
  const kept = minutes === undefined ? {} : { chosenMinutes: minutes };
  await ctx.deps.repositories.tasks.put({ ...task, startCue: cue, ...kept });
  await ctx.refresh();
}

/**
 * The length on the wheel is kept with today's thing while it is set and not begun, for the start
 * a cue's message or the last bite makes. Nothing is kept for any other thing.
 */
export async function keepChosenMinutes(
  ctx: DayContext,
  taskId: string,
  minutes: number | undefined,
): Promise<void> {
  const task = waitingTask(ctx.memory.state.today);
  if (minutes === undefined || task?.id !== taskId || task.chosenMinutes === minutes) return;
  await ctx.deps.repositories.tasks.put({ ...task, chosenMinutes: minutes });
}

/** "Now": the thing has no cue, and so no message of its own. */
export async function cueCleared(ctx: DayContext): Promise<void> {
  const { today } = ctx.memory.state;
  if (!('task' in today) || (today.task.startCue ?? null) === null) return;
  await ctx.deps.repositories.tasks.put({ ...today.task, startCue: null });
  await ctx.refresh();
}

/**
 * A cue is for a thing nobody has begun. Once a session has started on it, however it was started,
 * the cue is spent: it is taken off the row as the day is read, so it can never come back with a
 * thing that is carried on, parked or picked up again.
 */
export async function withoutSpentCues(
  repositories: Pick<Repositories, 'tasks'>,
  tasks: readonly TaskRow[],
): Promise<TaskRow[]> {
  const read: TaskRow[] = [];
  for (const task of tasks) {
    if ((task.startCue ?? null) === null || task.status === 'set') {
      read.push(task);
      continue;
    }
    const cleared = { ...task, startCue: null };
    await repositories.tasks.put(cleared);
    read.push(cleared);
  }
  return read;
}

export interface CueTimedInput {
  readonly today: TodayState;
  readonly settings: SettingsRow;
  readonly localDate: IsoDate;
  readonly timeZone: string;
  /** Unset, the cue's time is taken as still ahead. */
  readonly now?: Instant | undefined;
}

/**
 * The cue of today's thing for the notification plan: one timed message at the cue's time, or
 * none when the thing has no cue, has been begun, or the time has gone by on this day.
 */
export function cueTimed(input: CueTimedInput): TimedNotification[] {
  const task = waitingTask(input.today);
  const cue = task?.startCue ?? null;
  if (cue === null) return [];
  const back = backAround({
    cue,
    moments: dayMomentTimes(input.settings),
    localDate: input.localDate,
    timeZone: input.timeZone,
    now: input.now ?? Number.NEGATIVE_INFINITY,
  });
  return back.ahead ? [{ kind: 'cue', at: back.at }] : [];
}

/** The pack as the task keeps it, with the cue's message the same answer wrote, if it wrote one. */
export function withCueLine(
  lines: SessionLinePack,
  cueNotification: DayNotification | null | undefined,
): StoredSessionLines {
  return cueNotification == null ? lines : { ...lines, cueNotification };
}

/** The cue's message the task call wrote for this thing, when it opens on the cue exactly once. */
function writtenCue(task: Pick<TaskRow, 'lines'> | null | undefined): string | null {
  const lines = task?.lines ?? null;
  if (lines === null || !('hatch' in lines)) return null;
  const text = lines.cueNotification?.text ?? null;
  if (text === null || !text.startsWith(cuePlaceholder)) return null;
  return text.split(cuePlaceholder).length === 2 ? text : null;
}

/**
 * What the cue's message says, with the cue said back at its opening: the line the task call
 * wrote for this thing when `written` holds one, otherwise the offline pack's line in the given
 * voice. A heavy thing gets the plain line, which no monster signs, whatever was written.
 */
export function cueWords(
  language: Language,
  voice: Attitude | 'plain',
  cue: StartCue,
  written?: Pick<TaskRow, 'lines'> | null,
): string {
  const own = voice === 'plain' ? null : writtenCue(written);
  const line =
    own ??
    (voice === 'plain' ? helperLine(language, 'plain', 'cue') : helperLine(language, voice, 'cue'));
  return line.replaceAll(cuePlaceholder, cueSaid(language, cue));
}

/** The clock time a cue stands for with these settings: what the sheet writes beside a moment. */
export function cueClockFor(settings: SettingsRow, cue: StartCue): ClockTime {
  return cueClock(cue, dayMomentTimes(settings));
}
