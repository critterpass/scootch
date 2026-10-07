import type { Id } from '@scootch/domain';

import type { SqlDatabase } from './table';

/** Everything a person sent for a task that was set before the model could answer. */
export interface UnsortedWords {
  readonly taskId: Id;
  readonly text: string;
}

export interface UnsortedWordsStore {
  all(): Promise<UnsortedWords[]>;
  for(taskId: Id): Promise<UnsortedWords | null>;
  keep(words: UnsortedWords): Promise<void>;
  remove(taskId: Id): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'unsortedWords';

function parse(stored: string | undefined): UnsortedWords[] {
  if (stored === undefined) return [];
  try {
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (one): one is UnsortedWords =>
        typeof one === 'object' &&
        one !== null &&
        typeof (one as UnsortedWords).taskId === 'string' &&
        typeof (one as UnsortedWords).text === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Kept as one key of the key and value table the settings live in: no table of its own, it
 * survives a relaunch, and it goes with everything else when the person deletes their data. The
 * settings row, the backup and the export all skip it. The words leave as soon as the model has
 * sorted them into the one thing and the parked rest.
 */
export function unsortedWordsStore(db: SqlDatabase): UnsortedWordsStore {
  const all = async () => {
    const rows = await db.getAllAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [KEY],
    );
    return parse(rows[0]?.value);
  };
  const write = async (words: readonly UnsortedWords[]) => {
    if (words.length === 0) {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [KEY]);
      return;
    }
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      [KEY, JSON.stringify(words)],
    );
  };
  return {
    all,
    for: async (taskId) => (await all()).find((one) => one.taskId === taskId) ?? null,
    keep: async (words) =>
      write([...(await all()).filter((one) => one.taskId !== words.taskId), words]),
    remove: async (taskId) => write((await all()).filter((one) => one.taskId !== taskId)),
    clear: () => write([]),
  };
}
