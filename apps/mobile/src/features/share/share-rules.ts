import type { TaskRow } from '@scootch/domain';

/**
 * Whether sharing may be offered for a task. The flags are read as the store keeps them and are
 * never worked out again: a serious task, a task the person marked private, a task nobody has
 * screened yet and a task that is no longer stored are never offered for sharing.
 */
export function shareOffered(task: Pick<TaskRow, 'screen' | 'sharePrivate'> | null): boolean {
  if (task === null) return false;
  return task.screen === 'pass' && task.sharePrivate !== true;
}
