import type { TaskRow } from '@scootch/domain';

/**
 * Whether the quiet screen offers "It's fine, be funny". Only for a task a screen called serious:
 * a thing the phone's own gate held has had no screen yet, and might be a crisis, so nothing is
 * unlocked for it until a screen answers.
 */
export function offersBeFunny(task: Pick<TaskRow, 'screen'>): boolean {
  return task.screen === 'serious';
}
