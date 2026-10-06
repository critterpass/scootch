import type { SqlDatabase } from '../../data/table';

/** When the last snapshot reached the server, as an ISO instant. */
export const LAST_BACKUP_KEY = 'lastBackupAt';
/** Left as `1` when "delete everything" could not reach the server, until a retry gets through. */
export const SERVER_DELETE_PENDING_KEY = 'serverDeletePending';

/**
 * Small values of this feature's own, kept in the settings key and value table beside the
 * settings fields. The settings repository skips keys it does not know, so these never show up
 * as a setting, in a snapshot or in an export.
 */
export interface SettingsValues {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function settingsValues(db: SqlDatabase): SettingsValues {
  return {
    get: async (key) => {
      const rows = await db.getAllAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [key],
      );
      return rows[0]?.value ?? null;
    },
    set: async (key, value) => {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
        [key, value],
      );
    },
    remove: async (key) => {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    },
  };
}
