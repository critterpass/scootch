import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useSyncExternalStore } from 'react';

import type { DataDatabase } from '../../data/data-database';
import { readKv, writeKv } from '../../data/kv-repository';
import { readSetting, writeSetting } from '../../data/settings-repository';

import type { PlainCompany } from './care-mode';

/** What care keeps on the phone beside the board. */
export const CARE_KEYS = {
  /** `<instant> <day>` while he keeps plain company after a closed crisis screen; empty after. */
  plainCompany: 'care.plain-company',
  /** "It's fine, be funny": the person's own switch for things the screen judged serious. */
  beFunny: 'care.be-funny',
} as const;

export async function readPlainCompany(db: DataDatabase): Promise<PlainCompany | null> {
  const stored = await readKv(db, CARE_KEYS.plainCompany);
  if (stored === null || stored === '') return null;
  const [since, day] = stored.split(' ');
  const at = Number(since);
  return Number.isFinite(at) && day !== undefined ? { since: at, day } : null;
}

export async function writePlainCompany(
  db: DataDatabase,
  plain: PlainCompany | null,
  at: number,
): Promise<void> {
  await writeKv(
    db,
    CARE_KEYS.plainCompany,
    plain === null ? '' : `${plain.since} ${plain.day}`,
    at,
  );
  memory.set(plain);
}

export async function readBeFunny(db: DataDatabase): Promise<boolean> {
  return (await readSetting<boolean>(db, CARE_KEYS.beFunny)) === true;
}

export async function writeBeFunny(db: DataDatabase, on: boolean): Promise<void> {
  await writeSetting(db, CARE_KEYS.beFunny, on ? true : null);
}

/** The plain company in memory, for the screens; the kv row is the truth across launches. */
function createMemory() {
  let plain: PlainCompany | null = null;
  let loaded: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const set = (next: PlainCompany | null): void => {
    plain = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    get: (): PlainCompany | null => plain,
    set,
    load: (db: DataDatabase): Promise<void> => {
      loaded ??= readPlainCompany(db).then(
        (stored) => set(stored),
        () => {
          loaded = null;
        },
      );
      return loaded;
    },
    forget: (): void => {
      loaded = null;
      set(null);
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const memory = createMemory();

/** The plain company after a closed crisis, kept up to date. */
export function usePlainCompany(): PlainCompany | null {
  const db = useSQLiteContext();
  useEffect(() => {
    void memory.load(db);
  }, [db]);
  return useSyncExternalStore(memory.subscribe, memory.get, memory.get);
}
