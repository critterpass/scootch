import type { Id, IsoDate } from '@scootch/domain';

import type { SqlDatabase } from './table';

/** Small facts about one day that no table row holds. They are forgotten when the day turns. */
export interface DayNotes {
  readonly localDate: IsoDate;
  /** Starts used today by things that were then let go: their rows are gone, the start is not. */
  readonly startsLetGo: number;
  /**
   * "That's it for today" was tapped: what it moved, so it can be taken back the same day.
   * `taskId` is `null` when the day rested with nothing on it.
   */
  readonly rested: {
    readonly taskId: Id | null;
    readonly carriedOver: boolean;
    /** What the task was before it was moved; absent in a note written before this was kept. */
    readonly status?: 'set' | 'started';
  } | null;
}

export interface DayNotesStore {
  /** The notes for `localDate`; an earlier day's notes read as none. */
  read(localDate: IsoDate): Promise<DayNotes>;
  write(notes: DayNotes): Promise<void>;
}

const KEY = 'dayNotes';

/** One key of the key and value table the settings live in; the settings row and the backup skip it. */
export function dayNotesStore(db: SqlDatabase): DayNotesStore {
  return {
    read: async (localDate) => {
      const empty: DayNotes = { localDate, startsLetGo: 0, rested: null };
      const rows = await db.getAllAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [KEY],
      );
      try {
        const stored = JSON.parse(rows[0]?.value ?? 'null') as Partial<DayNotes> | null;
        if (stored === null || stored.localDate !== localDate) return empty;
        return {
          localDate,
          startsLetGo: Number.isInteger(stored.startsLetGo) ? (stored.startsLetGo ?? 0) : 0,
          rested: stored.rested ?? null,
        };
      } catch {
        return empty;
      }
    },
    write: async (notes) => {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
        [KEY, JSON.stringify(notes)],
      );
    },
  };
}
