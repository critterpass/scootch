import type { Id, Instant } from '@scootch/domain';

import type { SqlDatabase } from './table';

/** The one gentle reminder a person asked for on a heavy task. */
export interface CareReminder {
  readonly taskId: Id;
  readonly at: Instant;
}

export interface CareReminders {
  read(): Promise<CareReminder | null>;
  write(reminder: CareReminder): Promise<void>;
  clear(): Promise<void>;
}

const TASK_KEY = 'careReminderTaskId';
const AT_KEY = 'careReminderAt';

/**
 * Kept as two keys of the key and value table the settings live in, so it survives a relaunch and
 * goes with everything else when the person deletes their data. The settings row ignores both.
 */
export function careReminders(db: SqlDatabase): CareReminders {
  const clear = async () => {
    await db.runAsync('DELETE FROM settings WHERE key IN (?, ?)', [TASK_KEY, AT_KEY]);
  };
  const put = (key: string, value: string) =>
    db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  return {
    read: async () => {
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM settings WHERE key IN (?, ?)',
        [TASK_KEY, AT_KEY],
      );
      const taskId = rows.find((row) => row.key === TASK_KEY)?.value;
      const at = Number(rows.find((row) => row.key === AT_KEY)?.value);
      return taskId !== undefined && Number.isFinite(at) ? { taskId, at } : null;
    },
    write: async ({ taskId, at }) => {
      await put(TASK_KEY, taskId);
      await put(AT_KEY, String(at));
    },
    clear,
  };
}
