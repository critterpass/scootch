import { randomUUID } from 'expo-crypto';
import { getLocales } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { DAY_ROLLOVER_HOUR } from '@phusclass/domain';
import { wallClock } from '@phusclass/domain/board';
import { hasMarks } from '@phusclass/domain/hearing';

import { splitTasks } from '../../modules/phusclass-intelligence';

import { createBoardStore, type BoardStore } from './board-store';
import type { BoardSnapshot } from './board-view';

const BoardContext = createContext<BoardStore | null>(null);

/** While something is burning or running, the clock is read every second; otherwise twice a minute. */
const LIVE_PHASES = new Set(['waiting', 'running', 'time up', 'recess']);
const QUIET_TICKS = 30;

/** Regions that write the month before the day. */
const MONTH_FIRST_REGIONS = new Set(['US', 'PH', 'FM', 'MH', 'PW']);

/**
 * Opens the board on the phone's database (already migrated by the time this renders), loads it
 * and keeps its clock readings fresh. The day rolls over at four in the morning, in the phone's
 * own time zone.
 */
export function BoardProvider({ children }: { readonly children: ReactNode }) {
  const db = useSQLiteContext();
  const store = useMemo(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = getLocales()[0]?.regionCode ?? null;
    return createBoardStore({
      db,
      clock: wallClock(timeZone, DAY_ROLLOVER_HOUR),
      newId: randomUUID,
      dayFirst: region === null || !MONTH_FIRST_REGIONS.has(region),
      // Apple's on-device model splits a ramble first where the phone has it; the rules hear it
      // whenever it is not there, slow or unsure.
      split: (text) => splitTasks(text, hasMarks(text) ? 'vi' : 'en'),
    });
  }, [db]);

  useEffect(() => {
    void store.load();
    let quiet = 0;
    const timer = setInterval(() => {
      quiet += 1;
      if (LIVE_PHASES.has(store.getSnapshot().phase) || quiet >= QUIET_TICKS) {
        quiet = 0;
        store.tick();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [store]);

  return <BoardContext.Provider value={store}>{children}</BoardContext.Provider>;
}

/** The store's actions, for a screen that changes the board. */
export function useBoardStore(): BoardStore {
  const store = useContext(BoardContext);
  if (store === null) throw new Error('useBoardStore needs a BoardProvider above it');
  return store;
}

/** The board and the desk as they stand now. */
export function useBoard(): BoardSnapshot {
  const store = useBoardStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
