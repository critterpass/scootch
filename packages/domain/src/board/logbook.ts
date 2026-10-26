import type { Instant, IsoDate } from './moment';
import type { CommentStep, Task } from './task';

/** One line of the sổ đầu bài. No totals and no averages, by design. */
export type LogbookEntry = {
  readonly taskId: string;
  readonly text: string;
  readonly at: Instant;
  readonly day: IsoDate;
  /** `null` for a task ticked off the board without a period. */
  readonly periodMinutes: number | null;
  /** `null` for a heavy task or a tick: nothing to sign. */
  readonly comment: CommentStep | null;
  readonly giayKhen: boolean;
};

/** Finished tasks, newest first. */
export function logbook(tasks: readonly Task[]): LogbookEntry[] {
  const entries: LogbookEntry[] = [];
  for (const task of tasks) {
    if (task.status !== 'done' || task.done === null) continue;
    entries.push({
      taskId: task.id,
      text: task.text,
      at: task.done.at,
      day: task.done.day,
      periodMinutes: task.done.periodMinutes,
      comment: task.done.comment,
      giayKhen: task.done.giayKhen,
    });
  }
  return entries.sort((a, b) => b.at - a.at);
}
