import { DAY_MS, type Moment } from './moment';
import type { Task } from './task';

/** An undated task on the board untouched this many days fades like old chalk. */
export const FADE_AFTER_DAYS = 14;

/**
 * - `clear`: drawn normally.
 * - `fading`: faded, and "Still yours?" has not been asked yet.
 * - `asked`: faded, asked once, not answered. It is never asked again and stays until the user
 *   answers, erases it or touches it. Nothing leaves the board without the user saying so.
 */
export type FadeState = 'clear' | 'fading' | 'asked';

export function fadeStateOf(task: Task, now: Moment): FadeState {
  if (task.status !== 'board' || task.dueDate !== null) return 'clear';
  if (now.at - task.lastTouched < FADE_AFTER_DAYS * DAY_MS) return 'clear';
  return task.stillYoursAskedAt !== null && task.stillYoursAskedAt >= task.lastTouched
    ? 'asked'
    : 'fading';
}

export function isFaded(task: Task, now: Moment): boolean {
  return fadeStateOf(task, now) !== 'clear';
}

/** The one task to ask "Still yours?" about now: the longest untouched of those not yet asked. */
export function stillYoursToAsk(tasks: readonly Task[], now: Moment): Task | null {
  const waiting = tasks
    .filter((task) => fadeStateOf(task, now) === 'fading')
    .sort((a, b) => a.lastTouched - b.lastTouched || a.createdAt - b.createdAt);
  return waiting[0] ?? null;
}

/** Records that the question was put. */
export function askedStillYours(task: Task, now: Moment): Task {
  return { ...task, stillYoursAskedAt: now.at };
}

/** "Yes" makes it fresh again; "no" rubs it off quietly. */
export function answerStillYours(task: Task, answer: 'yes' | 'no', now: Moment): Task {
  if (answer === 'no') return { ...task, status: 'erased', desk: null };
  return { ...task, lastTouched: now.at, stillYoursAskedAt: null };
}
