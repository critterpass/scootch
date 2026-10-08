import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/** How many times, ever, the one screen shows by itself that it can be pulled down. */
export const NUDGE_LIMIT = 3;
/** How long home rests before the nudge plays, and how long it is up. */
const WAITS_MS = 1400;
export const NUDGE_MS = 2000;
// Kept beside the settings, under its own key: it counts something this phone has shown.
const KEY = 'drawer.pullNudges';

/**
 * Whether the nudge is due: something is in the drawer to be found, and the person has not been
 * shown the way there three times already.
 */
export function nudgeDue(shownBefore: number, parked: number): boolean {
  return parked > 0 && shownBefore < NUDGE_LIMIT;
}

// Once for each time the app is opened, however often home comes back to rest.
let playedThisRun = false;

/**
 * True for a moment when the one screen should show its pull by itself: the drawer has something
 * in it, home is at rest, and it has been shown fewer than three times on this phone. Each showing
 * is counted as it starts, so the count holds across restarts.
 */
export function usePullNudge(parked: number, resting: boolean): boolean {
  const db = useSQLiteContext();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (playedThisRun || !resting || parked === 0) return undefined;
    let current = true;
    let done: ReturnType<typeof setTimeout> | null = null;
    const wait = setTimeout(() => {
      void db
        .getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [KEY])
        .then(async (row) => {
          const before = Number(row?.value ?? 0) || 0;
          if (!current || playedThisRun || !nudgeDue(before, parked)) return;
          playedThisRun = true;
          await db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
            [KEY, String(before + 1)],
          );
          if (!current) return;
          setPlaying(true);
          done = setTimeout(() => setPlaying(false), NUDGE_MS);
        })
        .catch(() => undefined);
    }, WAITS_MS);
    return () => {
      current = false;
      clearTimeout(wait);
      if (done) clearTimeout(done);
      setPlaying(false);
    };
  }, [db, parked, resting]);
  return playing;
}
