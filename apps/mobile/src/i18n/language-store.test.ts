import { describe, expect, it } from '@jest/globals';

import { pickLanguage } from '@scootch/i18n';

import { sql as createSettings } from '../db/migrations/0001-create-settings';
import { readStoredLanguage, storeLanguage, type SettingsDatabase } from './language-store';

// A real SQLite database in memory with the app's own settings table. Jest's module loader does
// not know `node:sqlite`, so it is taken from the process instead of imported.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

function openDatabase(): SettingsDatabase {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(createSettings);
  return {
    getFirstAsync: <T>(source: string, params: string[]) =>
      Promise.resolve((sqlite.prepare(source).get(...params) as T | undefined) ?? null),
    runAsync: (source, params) => Promise.resolve(sqlite.prepare(source).run(...params)),
  };
}

/** The language the app would show on a phone with these languages. */
async function languageOn(db: SettingsDatabase, deviceLocales: readonly string[]) {
  return pickLanguage(deviceLocales, await readStoredLanguage(db));
}

describe('the interface language', () => {
  it('follows the phone when the person has not chosen', async () => {
    const db = openDatabase();
    expect(await readStoredLanguage(db)).toBeNull();
    expect(await languageOn(db, ['vi-VN', 'en-US'])).toBe('vi');
    expect(await languageOn(db, ['en-GB', 'vi-VN'])).toBe('en');
  });

  it('keeps the stored choice over the phone, and the last choice wins', async () => {
    const db = openDatabase();
    await storeLanguage(db, 'en');
    expect(await languageOn(db, ['vi-VN'])).toBe('en');
    await storeLanguage(db, 'vi');
    expect(await readStoredLanguage(db)).toBe('vi');
    expect(await languageOn(db, ['en-US'])).toBe('vi');
  });

  it('goes back to the phone when the choice is cleared', async () => {
    const db = openDatabase();
    await storeLanguage(db, 'en');
    await storeLanguage(db, null);
    expect(await readStoredLanguage(db)).toBeNull();
    expect(await languageOn(db, ['vi-VN'])).toBe('vi');
  });

  it('falls back to English on a phone in a language the app is not written in', async () => {
    const db = openDatabase();
    expect(await languageOn(db, ['fr-FR', 'de-DE'])).toBe('en');
    expect(await languageOn(db, [])).toBe('en');
  });

  it('ignores a stored value that is not a language the app ships', async () => {
    const db = openDatabase();
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['language', 'fr']);
    expect(await readStoredLanguage(db)).toBeNull();
    expect(await languageOn(db, ['vi-VN'])).toBe('vi');
  });
});
