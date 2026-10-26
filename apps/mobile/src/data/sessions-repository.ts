import type { SessionRow } from '@phusclass/domain/board';

import type { DataDatabase } from './data-database';

const columns = 'id, task_id, started_at, minutes, inside_fuse, happening, ended_at, outcome';

/** A period begins. */
export async function startSession(
  db: DataDatabase,
  session: Omit<SessionRow, 'ended_at' | 'outcome'>,
): Promise<void> {
  await db.runAsync(`INSERT INTO sessions (${columns}) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`, [
    session.id,
    session.task_id,
    session.started_at,
    session.minutes,
    session.inside_fuse,
    session.happening,
  ]);
}

/** A period ends, with how it ended. Ending it twice keeps the first ending. */
export async function endSession(
  db: DataDatabase,
  id: string,
  endedAt: number,
  outcome: NonNullable<SessionRow['outcome']>,
): Promise<void> {
  await db.runAsync(
    'UPDATE sessions SET ended_at = ?, outcome = ? WHERE id = ? AND ended_at IS NULL',
    [endedAt, outcome, id],
  );
}

/** The period still running, if any. */
export async function readOpenSession(db: DataDatabase): Promise<SessionRow | null> {
  return db.getFirstAsync<SessionRow>(
    `SELECT ${columns} FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
    [],
  );
}

/** Every period on a task, oldest first. */
export async function readSessionsFor(db: DataDatabase, taskId: string): Promise<SessionRow[]> {
  return db.getAllAsync<SessionRow>(
    `SELECT ${columns} FROM sessions WHERE task_id = ? ORDER BY started_at`,
    [taskId],
  );
}
