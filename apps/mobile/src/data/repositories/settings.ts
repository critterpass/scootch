import { settingsRowSchema, type Language, type SettingsRow } from '@scootch/domain';

import type { SqlDatabase } from '../table';

type StoredSettings = Omit<SettingsRow, 'id'>;

/** What a phone starts with. The language follows the phone until the person chooses one. */
export function defaultSettings(language: Language): SettingsRow {
  return {
    id: 'settings',
    attitude: 'cheeky',
    language,
    music: true,
    effects: true,
    haptics: true,
    motion: 'full',
    quietHoursStart: '21:00',
    quietHoursEnd: '08:30',
    catchWith: 'rolled',
    keepTranscripts: false,
    canBeHaunted: true,
    hideTableLabel: false,
    worldCardOnHome: true,
    iconFollows: 'attitude',
    iconPinned: 'cheeky',
    wallpaper: 'world',
    firstLaunchDoneAt: null,
  };
}

const BOOLEANS: ReadonlySet<string> = new Set([
  'music',
  'effects',
  'haptics',
  'keepTranscripts',
  'canBeHaunted',
  'hideTableLabel',
  'worldCardOnHome',
] satisfies (keyof StoredSettings)[]);

/** The key the finish method was kept under when it was the catch, two taps or saying "done". */
const FINISH_WITH_BEFORE = 'finishWith';

export interface SettingsRepository {
  /** The settings row. A field never written reads as its default. */
  read(phoneLanguage: Language): Promise<SettingsRow>;
  write(changes: Partial<StoredSettings>): Promise<void>;
}

/**
 * The single settings row, kept in the key and value table the app was first shipped with: one
 * key per field, so the interface language stays the same `language` key the language picker reads.
 */
export function settingsRepository(db: SqlDatabase): SettingsRepository {
  return {
    read: async (phoneLanguage) => {
      const stored = await db.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM settings',
        [],
      );
      const row: Record<string, unknown> = { ...defaultSettings(phoneLanguage) };
      // Someone who had chosen to finish without the catch's gesture keeps a finish without it.
      const before = stored.find(({ key }) => key === FINISH_WITH_BEFORE)?.value;
      if (before === 'double_tap' || before === 'voice') row.catchWith = 'hold';
      for (const { key, value } of stored) {
        if (!(key in row) || key === 'id') continue;
        row[key] = BOOLEANS.has(key) ? value === '1' : value;
      }
      const checked = settingsRowSchema.safeParse(row);
      // A stored value the app no longer understands falls back to the defaults, never a crash.
      return checked.success ? checked.data : defaultSettings(phoneLanguage);
    },
    write: async (changes) => {
      const current = defaultSettings('en');
      settingsRowSchema.partial().parse(changes);
      for (const [key, value] of Object.entries(changes)) {
        if (!(key in current) || key === 'id' || value === undefined) continue;
        if (value === null) {
          await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
          continue;
        }
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
          [key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value)],
        );
      }
    },
  };
}
