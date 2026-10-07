import type { DayRow, IsoDate, SessionRow, TaskRow } from '../contracts';

export const FREE_STARTS_PER_DAY = 10;
/** More than the free limit, so "One more" stays a perk of Plus. */
export const PLUS_STARTS_PER_DAY = 25;

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
  /** The sessions of today's tasks, and every session started today. */
  readonly sessions: readonly SessionRow[];
  readonly plus: boolean;
  /** Starts used today by things that are no longer stored: let go after a session ran. */
  readonly spent?: number;
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

/**
 * Starts still open today. A start is used by a task that was started today, wherever that task is
 * now: one carried on to tomorrow still used its start. A task that was let go has no row and no
 * session left; a start it really used is counted in `spent`, so letting go never makes a start.
 */
export function startsLeft(
  input: Pick<TodayInput, 'localDate' | 'tasks' | 'plus' | 'spent'> & {
    readonly sessions?: readonly SessionRow[];
  },
): number {
  const used = new Set<string>();
  for (const task of input.tasks) {
    if (task.localDate === input.localDate && task.status !== 'set') used.add(task.id);
  }
  for (const session of input.sessions ?? []) {
    if (session.localDate === input.localDate) used.add(session.taskId);
  }
  return Math.max(0, startsAllowed(input.plus) - used.size - Math.max(0, input.spent ?? 0));
}

/** Whether one more thing may be taken on or started today. */
export function hasStartLeft(today: TodayState): boolean {
  return 'startsLeft' in today && today.startsLeft > 0;
}

/** Start would be refused: the task has not been started and today has no start left for it. */
export function startRefused(today: TodayState): boolean {
  return today.kind === 'task_set' && today.task.status === 'set' && today.startsLeft <= 0;
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
