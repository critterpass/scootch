import type { DataDatabase } from '../../data/data-database';
import { readSetting, writeSetting } from '../../data/settings-repository';

import { DEFAULT_QUIET, type QuietHours } from './notes-plan';

export const NOTES_KEYS = {
  enabled: 'notes.enabled',
  quiet: 'notes.quiet-hours',
  timeSensitive: 'notes.time-sensitive',
} as const;

export interface NotesSettings {
  /** He may write notes home. Off until the person says yes on the first day or in Settings. */
  readonly enabled: boolean;
  readonly quiet: QuietHours;
  /** The day's last note may come through Focus. Off unless the person turns it on. */
  readonly timeSensitive: boolean;
}

function isQuiet(value: unknown): value is QuietHours {
  const minute = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 1440;
  return (
    typeof value === 'object' &&
    value !== null &&
    minute((value as QuietHours).from) &&
    minute((value as QuietHours).to)
  );
}

export async function readNotesSettings(db: DataDatabase): Promise<NotesSettings> {
  const quiet = await readSetting<unknown>(db, NOTES_KEYS.quiet);
  return {
    enabled: (await readSetting<boolean>(db, NOTES_KEYS.enabled)) === true,
    quiet: isQuiet(quiet) ? quiet : DEFAULT_QUIET,
    timeSensitive: (await readSetting<boolean>(db, NOTES_KEYS.timeSensitive)) === true,
  };
}

const changed = new Set<() => void>();

/** Told after the notes settings change, so the notes home are planned again. */
export function onNotesSettingsChange(listener: () => void): () => void {
  changed.add(listener);
  return () => {
    changed.delete(listener);
  };
}

export async function writeNotesSettings(
  db: DataDatabase,
  change: Partial<NotesSettings>,
): Promise<void> {
  if (change.enabled !== undefined) await writeSetting(db, NOTES_KEYS.enabled, change.enabled);
  if (change.quiet !== undefined) await writeSetting(db, NOTES_KEYS.quiet, change.quiet);
  if (change.timeSensitive !== undefined) {
    await writeSetting(db, NOTES_KEYS.timeSensitive, change.timeSensitive);
  }
  for (const listener of [...changed]) listener();
}

/** `22:00`, as both languages write a time in Settings. */
export function clockText(minute: number): string {
  const hours = Math.floor(minute / 60);
  return `${String(hours).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
