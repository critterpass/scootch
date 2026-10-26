import type { LogbookRow } from '@phusclass/domain/board';

import type { DataDatabase } from './data-database';

const columns = 'task_id, text, done_at, day, period_minutes, comment, carving, giay_khen';

/** The logbook, newest first. */
export async function readLogbook(db: DataDatabase): Promise<LogbookRow[]> {
  return db.getAllAsync<LogbookRow>(`SELECT ${columns} FROM logbook ORDER BY done_at DESC`, []);
}

/** Writes a finish; writing it again replaces it. */
export async function writeLogbookRow(db: DataDatabase, row: LogbookRow): Promise<void> {
  await db.runAsync(
    `INSERT INTO logbook (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (task_id) DO UPDATE SET text = excluded.text, done_at = excluded.done_at,
       day = excluded.day, period_minutes = excluded.period_minutes, comment = excluded.comment,
       carving = excluded.carving, giay_khen = excluded.giay_khen`,
    [
      row.task_id,
      row.text,
      row.done_at,
      row.day,
      row.period_minutes,
      row.comment,
      row.carving,
      row.giay_khen,
    ],
  );
}
