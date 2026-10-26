import type { Slip, SlipRow } from '@phusclass/domain/board';

import type { DataDatabase } from './data-database';

/** Every slip of the given tasks, oldest first. */
export async function readSlips(db: DataDatabase, taskIds: readonly string[]): Promise<SlipRow[]> {
  if (taskIds.length === 0) return [];
  const marks = taskIds.map(() => '?').join(', ');
  return db.getAllAsync<SlipRow>(
    `SELECT id, task_id, reason, accepted, at FROM slips WHERE task_id IN (${marks}) ORDER BY at, id`,
    [...taskIds],
  );
}

/**
 * Writes the slips a task carries that are not stored yet. Slips are only ever added, so the ones
 * past the stored count are the new ones.
 */
export async function addNewSlips(
  db: DataDatabase,
  taskId: string,
  slips: readonly Slip[],
): Promise<void> {
  const stored = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM slips WHERE task_id = ?',
    [taskId],
  );
  for (const slip of slips.slice(stored?.count ?? 0)) {
    await db.runAsync('INSERT INTO slips (task_id, reason, accepted, at) VALUES (?, ?, ?, ?)', [
      taskId,
      slip.reason,
      slip.accepted ? 1 : 0,
      slip.at,
    ]);
  }
}
