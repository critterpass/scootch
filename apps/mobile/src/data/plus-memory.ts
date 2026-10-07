import type { SqlDatabase } from './table';

/** What the phone remembers about Plus between launches, each under its own key. */
export type PlusMemoryKey =
  | 'customer'
  | 'prices'
  | 'offerDismissedAt'
  | 'worldVisitedAt'
  | 'keptWeeks'
  | 'ink'
  | 'lifetimeMarkedOn'
  /** The free reads of Paper and Screen already had, and whether words may be sent to be read. */
  | 'cameraTries'
  | 'cameraConsent';

export interface PlusMemory {
  /** The stored value, or `null` when nothing was stored or it cannot be read. */
  read(key: PlusMemoryKey): Promise<unknown>;
  write(key: PlusMemoryKey, value: unknown): Promise<void>;
}

const PREFIX = 'plus.';

/**
 * Plus's own memory, kept as JSON in the key and value table beside the settings. The settings
 * row ignores keys it does not know, so these never reach it.
 */
export function plusMemory(db: SqlDatabase): PlusMemory {
  return {
    read: async (key) => {
      const rows = await db.getAllAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [PREFIX + key],
      );
      const stored = rows[0]?.value;
      if (stored === undefined) return null;
      try {
        return JSON.parse(stored) as unknown;
      } catch {
        return null;
      }
    },
    write: async (key, value) => {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
        [PREFIX + key, JSON.stringify(value)],
      );
    },
  };
}
