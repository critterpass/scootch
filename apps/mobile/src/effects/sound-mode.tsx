import { setAudioModeAsync } from 'expo-audio';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { createSoundModeControl } from './sound-mode-control';

/** The one audio session of the app, kept on the ringer rule. */
export const soundMode = createSoundModeControl((mode) => {
  void setAudioModeAsync(mode).catch(() => undefined);
});

// Kept beside the settings, under its own key: it is a choice about this phone's ringer switch.
const KEY = 'sound.musicWhenSilent';

interface KeyValueDatabase {
  getFirstAsync<T>(source: string, params: string[]): Promise<T | null>;
  runAsync(source: string, params: string[]): Promise<unknown>;
}

async function readChoice(db: KeyValueDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY],
  );
  return row?.value === '1';
}

async function storeChoice(db: KeyValueDatabase, on: boolean): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [KEY, on ? '1' : '0'],
  );
}

/** Reads the stored choice once, when the app opens, and hands it to the audio session. */
export function SoundMode() {
  const db = useSQLiteContext();
  useEffect(() => {
    void readChoice(db)
      .then((on) => soundMode.setMusicWhenSilent(on))
      .catch(() => undefined);
  }, [db]);
  return null;
}

/** The Settings row's value and its change: music with the ringer switch off. Off until chosen. */
export function useMusicWhenSilent(): readonly [boolean, (on: boolean) => void] {
  const db = useSQLiteContext();
  const [on, setOn] = useState(false);
  useEffect(() => {
    let current = true;
    void readChoice(db)
      .then((stored) => {
        if (current) setOn(stored);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db]);
  const change = useCallback(
    (next: boolean) => {
      setOn(next);
      soundMode.setMusicWhenSilent(next);
      void storeChoice(db, next).catch(() => undefined);
    },
    [db],
  );
  return [on, change];
}
