import type { DataDatabase } from './data-database';

/** The board's own small state, one text value per key. */
export async function readKv(db: DataDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [
    key,
  ]);
  return row?.value ?? null;
}

export async function writeKv(
  db: DataDatabase,
  key: string,
  value: string,
  at: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, at],
  );
}

/** A whole number kept in kv; `fallback` when it is missing or unreadable. */
export async function readKvNumber(
  db: DataDatabase,
  key: string,
  fallback: number,
): Promise<number> {
  const stored = await readKv(db, key);
  const value = Number(stored);
  return stored !== null && stored !== '' && Number.isFinite(value) ? value : fallback;
}
