import {
  DAY_MS,
  dayStartOf,
  isOpen,
  type Carving,
  type CommentStep,
  type Instant,
  type IsoDate,
  type Moment,
  type Task,
} from '@phusclass/domain/board';

/** The four cards a finish can be shared as (brief 12), in the order the sheet offers them. */
export const SHARE_FORMATS = ['paper', 'certificate', 'note', 'desk'] as const;
export type ShareFormat = (typeof SHARE_FORMATS)[number];

/** Why nothing is offered. */
export type ShareBlock = 'crisis day' | 'heavy task' | 'not finished';

export type ShareGuard =
  { readonly allowed: true } | { readonly allowed: false; readonly why: ShareBlock };

/** What the guard reads: the store's flags, never worked out again here. */
export type ShareGuardInput = {
  /** The finished task, or `null` when it is not in the logbook. */
  readonly task: Pick<Task, 'care' | 'status'> | null;
  /** Today is a crisis day (see `isCrisisDay`). */
  readonly crisisDay: boolean;
};

/**
 * Whether a finish may be shared at all. A crisis day shares nothing, whatever the task; a
 * serious or crisis task is never offered; only a finished task has anything to show.
 */
export function shareGuard(input: ShareGuardInput): ShareGuard {
  if (input.crisisDay) return { allowed: false, why: 'crisis day' };
  if (input.task === null || input.task.status !== 'done') {
    return { allowed: false, why: 'not finished' };
  }
  if (input.task.care !== 'none') return { allowed: false, why: 'heavy task' };
  return { allowed: true };
}

/**
 * A crisis day: the crisis screen was shown today (it stays a crisis day after it is closed), or
 * a task flagged crisis is still open or was said, finished or erased today. The day turns with
 * the board's own day.
 */
export function isCrisisDay(input: {
  readonly tasks: readonly Pick<Task, 'care' | 'status' | 'createdAt' | 'lastTouched'>[];
  readonly crisisShownOn: IsoDate | null;
  readonly now: Moment;
}): boolean {
  if (input.crisisShownOn === input.now.day) return true;
  const todayFrom = dayStartOf(input.now);
  return input.tasks.some(
    (task) =>
      task.care === 'crisis' &&
      (isOpen(task) || task.createdAt >= todayFrom || task.lastTouched >= todayFrom),
  );
}

/** Everything the four cards show about one finish. */
export type ShareSubject = {
  readonly taskId: string;
  /** In the user's own words. */
  readonly task: string;
  readonly doneAt: Instant;
  readonly day: IsoDate;
  /** `null` when it was ticked off the board without a period. */
  readonly periodMinutes: number | null;
  /** His rung on the ladder; `null` on a tick. */
  readonly comment: CommentStep | null;
  readonly giayKhen: boolean;
  /** Whole days from being said to being finished, as his comment counts them. */
  readonly waitedDays: number;
  /** The full name from roll call, or `null` when none was given. */
  readonly name: string | null;
  /** Every mark on the desk, oldest first. */
  readonly carvings: readonly Carving[];
};

/** The subject of a finished task, or `null` when the task is not finished. */
export function subjectOf(
  task: Task,
  carvings: readonly Carving[],
  name: string | null,
): ShareSubject | null {
  if (task.status !== 'done' || task.done === null) return null;
  return {
    taskId: task.id,
    task: task.text,
    doneAt: task.done.at,
    day: task.done.day,
    periodMinutes: task.done.periodMinutes,
    comment: task.done.comment,
    giayKhen: task.done.giayKhen,
    waitedDays: Math.max(0, Math.floor((task.done.at - task.createdAt) / DAY_MS)),
    name: name !== null && name.trim() !== '' ? name.trim() : null,
    carvings,
  };
}

/**
 * The cards this finish can be shared as. The giấy khen only when this finish earned one; the
 * others always.
 */
export function formatsFor(subject: Pick<ShareSubject, 'giayKhen'>): readonly ShareFormat[] {
  return SHARE_FORMATS.filter((format) => format !== 'certificate' || subject.giayKhen);
}
