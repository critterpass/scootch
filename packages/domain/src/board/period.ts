import { carvingFor } from './carvings';
import { commentFor, earnsGiayKhen } from './comment';
import type { Happening } from './happenings';
import { DAY_MS, MINUTE_MS, minutesOf, type Instant, type Moment } from './moment';
import { GET_READY_MINUTES } from './pick';
import { isInsideFuse } from './pressure';
import { heardTimeOn, isHeavy, talliesOf, type Carving, type CommentStep, type Task } from './task';

/** One period, unless the user changes it. */
export const DEFAULT_PERIOD_MINUTES = 10;
/** "Bỏ giấy ra!": on a pop-quiz session a period is fifteen minutes. */
export const POP_QUIZ_PERIOD_MINUTES = 15;
/** Ra chơi. */
export const RECESS_MINUTES = 5;

/** The length of the next period: the user's choice, else fifteen on a pop quiz, else ten. */
export function periodMinutes(input: {
  readonly chosen?: number | null;
  readonly happening?: Happening | null;
}): number {
  if (input.chosen != null && input.chosen > 0) return input.chosen;
  return input.happening === 'pop quiz' ? POP_QUIZ_PERIOD_MINUTES : DEFAULT_PERIOD_MINUTES;
}

/**
 * The period cut short so class ends in time to get ready for a time heard today. `null` when
 * there is no time left before it at all.
 */
export function periodBeforeHeardTime(minutes: number, task: Task, now: Moment): number | null {
  const heard = heardTimeOn(task, now.day);
  const at = heard === null ? null : minutesOf(heard);
  if (at === null || at <= now.minuteOfDay) return minutes;
  const left = at - now.minuteOfDay - GET_READY_MINUTES;
  return left <= 0 ? null : Math.min(minutes, left);
}

/** The drum: a period begins. Pressure goes to 0 and the fuse stops. */
export function startPeriod(task: Task, at: Instant): Task {
  if (task.status !== 'desk' || task.desk === null) return task;
  const insideFuse = task.desk.insideFuse ?? isInsideFuse(task, at);
  return { ...task, desk: { ...task.desk, startedAt: at, insideFuse }, lastTouched: at };
}

export function periodEndsAt(task: Task, minutes: number): Instant | null {
  return task.desk?.startedAt == null ? null : task.desk.startedAt + minutes * MINUTE_MS;
}

/** "Not yet." The three choices of partial credit. */
export type PartialChoice = 'another period' | 'back on board' | 'erase';

/**
 * Partial credit. Another period starts the drum again on the same task. Back on the board keeps
 * the user's one line for next time, shown first and word for word when it returns. Erase rubs
 * it off with no comment.
 */
export function partialCredit(task: Task, choice: PartialChoice, at: Instant, note?: string): Task {
  if (choice === 'erase') return { ...task, status: 'erased', desk: null, lastTouched: at };
  if (choice === 'another period') {
    if (task.desk === null) return task;
    return { ...task, desk: { ...task.desk, startedAt: at }, lastTouched: at };
  }
  const line = note?.trim() ?? '';
  return {
    ...task,
    status: 'board',
    desk: null,
    partialNote: line === '' ? task.partialNote : line,
    lastTouched: at,
  };
}

export type Finish = {
  readonly task: Task;
  readonly comment: CommentStep | null;
  readonly carving: Carving;
  readonly giayKhen: boolean;
  /** Recess is offered after every finish and never forced. */
  readonly recessOffered: true;
};

/**
 * "Done." The task is finished at the desk: graded (unless heavy), carved into the desk, and
 * written in the logbook. Everything surprising is seeded by the task, so a finish replayed from
 * storage gives the same comment and carving.
 */
export function finishTask(task: Task, now: Moment, periodLength: number): Finish {
  const seed = task.id;
  const heavy = isHeavy(task);
  const comment = commentFor({
    insideFuse: task.desk?.insideFuse ?? false,
    tallies: talliesOf(task),
    waitedDays: Math.max(0, Math.floor((now.at - task.createdAt) / DAY_MS)),
    heavy,
    seed,
  });
  const carving = carvingFor({ taskId: task.id, seed, comment, heavy, at: now.at });
  const giayKhen = earnsGiayKhen(comment, seed);
  return {
    task: {
      ...task,
      status: 'done',
      desk: null,
      partialNote: null,
      lastTouched: now.at,
      done: {
        at: now.at,
        day: now.day,
        periodMinutes: periodLength,
        comment,
        carving: carving.kind,
        giayKhen,
      },
    },
    comment,
    carving,
    giayKhen,
    recessOffered: true,
  };
}
