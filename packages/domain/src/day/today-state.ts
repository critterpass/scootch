import type { DayRow, IsoDate, SessionRow, TaskRow } from '../contracts';

export const FREE_STARTS_PER_DAY = 1;
export const PLUS_STARTS_PER_DAY = 3;

/** How many things may be started in one day. */
export function startsAllowed(plus: boolean): number {
  return plus ? PLUS_STARTS_PER_DAY : FREE_STARTS_PER_DAY;
}

/** A task that takes the quiet path: serious, and the user has not asked for the comedy back. */
export function isQuietTask(task: Pick<TaskRow, 'screen' | 'seriousOverridden'>): boolean {
  return task.screen === 'serious' && !task.seriousOverridden;
}

export interface TodayInput {
  readonly localDate: IsoDate;
  /** The day's row, or `null` before the app has been opened that day. */
  readonly day: DayRow | null;
  readonly tasks: readonly TaskRow[];
  readonly sessions: readonly SessionRow[];
  readonly plus: boolean;
}

/**
 * What the one screen is showing today. `crisis` carries nothing at all: every task is hidden for
 * the rest of that day, whatever else is stored.
 */
export type TodayState =
  | { readonly kind: 'crisis' }
  | { readonly kind: 'nothing_yet'; readonly startsLeft: number }
  | { readonly kind: 'task_set'; readonly task: TaskRow; readonly startsLeft: number }
  | { readonly kind: 'in_session'; readonly task: TaskRow; readonly session: SessionRow }
  /** A serious task, set or being worked on: plain words and quiet company. */
  | { readonly kind: 'serious'; readonly task: TaskRow; readonly session: SessionRow | null }
  | { readonly kind: 'done_for_today'; readonly startsLeft: number };

/** Starts still open today. A task that was let go has no row, so it gives its start back. */
export function startsLeft(input: Pick<TodayInput, 'localDate' | 'tasks' | 'plus'>): number {
  const used = input.tasks.filter(
    (task) => task.localDate === input.localDate && task.status !== 'set',
  ).length;
  return Math.max(0, startsAllowed(input.plus) - used);
}

export function todayState(input: TodayInput): TodayState {
  if (input.day?.status === 'crisis') return { kind: 'crisis' };

  const tasks = input.tasks.filter((task) => task.localDate === input.localDate);
  const left = startsLeft(input);
  const running = input.sessions.find(
    (session) => session.endedAt === null && tasks.some((task) => task.id === session.taskId),
  );
  const open = tasks
    .filter((task) => task.status !== 'finished')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const task = (running && open.find((one) => one.id === running.taskId)) ?? open[0];

  if (task) {
    const session = running && running.taskId === task.id ? running : null;
    if (isQuietTask(task)) return { kind: 'serious', task, session };
    if (session) return { kind: 'in_session', task, session };
    return { kind: 'task_set', task, startsLeft: left };
  }
  if (input.day?.status === 'done' || tasks.length > 0) {
    return { kind: 'done_for_today', startsLeft: left };
  }
  return { kind: 'nothing_yet', startsLeft: left };
}
