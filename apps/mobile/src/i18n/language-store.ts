import { isLanguage, type Language } from '@scootch/i18n';

/** The part of an expo-sqlite database the language choice uses. */
export interface SettingsDatabase {
  getFirstAsync<T>(source: string, params: string[]): Promise<T | null>;
  runAsync(source: string, params: string[]): Promise<unknown>;
}

const LANGUAGE_KEY = 'language';

/**
 * The language the person chose in the app, or null when they have not chosen and the phone's
 * language decides. A stored value that is not a language we ship counts as no choice.
 */
export async function readStoredLanguage(db: SettingsDatabase): Promise<Language | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [LANGUAGE_KEY],
  );
  return isLanguage(row?.value) ? row.value : null;
}

/** Keeps the person's choice; null forgets it, so the phone's language decides again. */
export async function storeLanguage(
  db: SettingsDatabase,
  language: Language | null,
): Promise<void> {
  if (language === null) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', [LANGUAGE_KEY]);
    return;
  }
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [LANGUAGE_KEY, language],
  );
}
