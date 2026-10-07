import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '../../state/day-store-provider';
import { useTableState, useTogether } from '../../state/together-context';

import type { TableStore } from './table-store';

/** The person's standing choices for every table, kept beside the settings on this phone. */
export interface TablePrefs {
  /** A seat shows its one or two words. Off, it shows "busy". */
  readonly showLabel: boolean;
  /** Nudges are shown and felt. Off, they are dropped on this phone and nobody is told. */
  readonly allowNudges: boolean;
}

export const DEFAULT_TABLE_PREFS: TablePrefs = { showLabel: true, allowNudges: true };

const KEYS = {
  showLabel: 'tables.showLabel',
  allowNudges: 'tables.allowNudges',
} as const satisfies Record<keyof TablePrefs, string>;

interface KeyValueDatabase {
  getAllAsync<T>(source: string, params: string[]): Promise<T[]>;
  runAsync(source: string, params: string[]): Promise<unknown>;
}

/** Both choices as stored; one never chosen is on. */
export async function readTablePrefs(db: KeyValueDatabase): Promise<TablePrefs> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings WHERE key IN (?, ?)',
    [KEYS.showLabel, KEYS.allowNudges],
  );
  const off = (key: string) => rows.some((row) => row.key === key && row.value === '0');
  return { showLabel: !off(KEYS.showLabel), allowNudges: !off(KEYS.allowNudges) };
}

async function storeTablePref(
  db: KeyValueDatabase,
  key: keyof TablePrefs,
  on: boolean,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [KEYS[key], on ? '1' : '0'],
  );
}

/** Hands the choices to the table, which is where they take effect. */
export function applyTablePrefs(
  table: Pick<TableStore, 'setMode' | 'allowNudges'>,
  prefs: TablePrefs,
): void {
  table.setMode({ hidden: !prefs.showLabel });
  table.allowNudges(prefs.allowNudges);
}

/**
 * Keeps the person's seat as they left it, from anywhere in the app: the stored choices are
 * handed to the table when the app opens, and the table is told when their one thing is done, so
 * the seat shows it while they stay.
 */
export function TableSeatKeeper() {
  const db = useSQLiteContext();
  const { table } = useTogether();
  const { tableId } = useTableState();
  const { session } = useSession();
  useEffect(() => {
    void readTablePrefs(db)
      .then((prefs) => applyTablePrefs(table, prefs))
      .catch(() => undefined);
  }, [db, table]);
  // Only a session the person finished says so: one put down or carried over says nothing.
  const finished = session !== null && session.phase === 'finished';
  useEffect(() => {
    if (finished && tableId !== null) table.done();
  }, [finished, tableId, table]);
  return null;
}

/** The two switches' values and their change. On until the person says otherwise. */
export function useTablePrefs(): readonly [
  TablePrefs,
  (key: keyof TablePrefs, on: boolean) => void,
] {
  const db = useSQLiteContext();
  const { table } = useTogether();
  const [prefs, setPrefs] = useState(DEFAULT_TABLE_PREFS);
  useEffect(() => {
    let current = true;
    void readTablePrefs(db)
      .then((stored) => {
        if (current) setPrefs(stored);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db]);
  const change = useCallback(
    (key: keyof TablePrefs, on: boolean) => {
      setPrefs((before) => {
        const next = { ...before, [key]: on };
        applyTablePrefs(table, next);
        return next;
      });
      void storeTablePref(db, key, on).catch(() => undefined);
    },
    [db, table],
  );
  return [prefs, change];
}
