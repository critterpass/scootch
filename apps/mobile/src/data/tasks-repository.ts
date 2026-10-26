import {
  DAY_MS,
  logbookRowOf,
  taskFromRows,
  taskToRow,
  type LogbookRow,
  type Task,
  type TaskRow,
} from '@phusclass/domain/board';

import type { DataDatabase } from './data-database';
import { writeLogbookRow } from './logbook-repository';
import { addNewSlips, readSlips } from './slips-repository';

const columns = [
  'id',
  'text',
  'created_at',
  'due_date',
  'heard_time_day',
  'heard_time_at',
  'last_touched',
  'partial_note',
  'status',
  'desk_since',
  'desk_opened',
  'desk_started_at',
  'desk_inside_fuse',
  'care',
  'screened',
  'still_yours_asked_at',
  'size_minutes',
  'swapped_at',
] as const satisfies readonly (keyof TaskRow)[];

/** Erased tasks are kept this long in memory, so a heavy one still counts for the day. */
const ERASED_KEPT_MS = 2 * DAY_MS;

/**
 * The tasks the board needs: everything not erased, and what was erased in the last two days.
 * Each comes with its slips and, when done, its logbook line.
 */
export async function readTasks(db: DataDatabase, now: number): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${columns.join(', ')} FROM tasks
     WHERE status != 'erased' OR last_touched >= ? ORDER BY created_at, id`,
    [now - ERASED_KEPT_MS],
  );
  const slips = await readSlips(
    db,
    rows.map((row) => row.id),
  );
  const finishes = await db.getAllAsync<LogbookRow>(
    `SELECT task_id, text, done_at, day, period_minutes, comment, carving, giay_khen
     FROM logbook WHERE task_id IN (SELECT id FROM tasks WHERE status = 'done')`,
    [],
  );
  const byTask = new Map(finishes.map((row) => [row.task_id, row]));
  return rows.map((row) => taskFromRows(row, slips, byTask.get(row.id) ?? null));
}

/** Writes a task whole: its row, any slips not stored yet and, once done, its logbook line. */
export async function writeTask(db: DataDatabase, task: Task): Promise<void> {
  const row = taskToRow(task);
  const values = columns.map((column) => row[column]);
  await db.runAsync(
    `INSERT INTO tasks (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
     ON CONFLICT (id) DO UPDATE SET ${columns
       .filter((column) => column !== 'id')
       .map((column) => `${column} = excluded.${column}`)
       .join(', ')}`,
    values,
  );
  await addNewSlips(db, task.id, task.slips);
  const finished = logbookRowOf(task);
  if (finished !== null) await writeLogbookRow(db, finished);
}

/** Writes several tasks in one transaction. */
export async function writeTasks(db: DataDatabase, tasks: readonly Task[]): Promise<void> {
  if (tasks.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const task of tasks) await writeTask(db, task);
  });
}
