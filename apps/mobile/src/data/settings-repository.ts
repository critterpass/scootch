import type { DataDatabase } from './data-database';

/** A setting, stored as JSON; `null` when unset or unreadable. */
export async function readSetting<T>(db: DataDatabase, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  if (row === null) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    // A value written by an older build in another shape counts as unset.
    return null;
  }
}

/** Stores a setting; `null` removes it. */
export async function writeSetting(db: DataDatabase, key: string, value: unknown): Promise<void> {
  if (value === null) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    return;
  }
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}
