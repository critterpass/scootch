import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useSyncExternalStore } from 'react';

import type { DataDatabase } from '../../data/data-database';
import { readSetting, writeSetting } from '../../data/settings-repository';

/** Settings the first day writes. */
export const FIRST_DAY_KEYS = {
  done: 'first-day.done',
  fullName: 'student.fullName',
} as const;

/** A word with its accent marks taken off, so a name typed without them still matches. */
function withoutMarks(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd').replaceAll('Đ', 'D');
}

/**
 * Family names that come first in a Vietnamese name. A name that starts with one is read family
 * name first, so the given name is its last word; any other name gives its first word.
 */
const FAMILY_FIRST = new Set(
  [
    'nguyễn',
    'trần',
    'lê',
    'phạm',
    'hoàng',
    'huỳnh',
    'phan',
    'vũ',
    'võ',
    'đặng',
    'bùi',
    'đỗ',
    'hồ',
    'ngô',
    'dương',
    'lý',
    'đinh',
    'đoàn',
    'lâm',
    'mai',
    'trịnh',
    'trương',
    'lương',
    'tạ',
    'cao',
    'tô',
    'hà',
    'quách',
    'châu',
    'thái',
    'tăng',
    'kiều',
    'văn',
    'triệu',
    'lưu',
    'la',
  ].map((name) => withoutMarks(name)),
);

/** The name as typed, tidied: single spaces, nothing around it. */
export function tidyName(typed: string): string {
  return typed.normalize('NFC').trim().split(/\s+/).filter(Boolean).join(' ');
}

/** The name he repeats back and remembers: "Trần Minh Anh" gives "Anh", "Sam Lee" gives "Sam". */
export function givenNameOf(fullName: string): string {
  const words = tidyName(fullName).split(' ');
  if (words.length <= 1) return words[0] ?? '';
  const first = withoutMarks((words[0] ?? '').toLocaleLowerCase('vi'));
  return (FAMILY_FIRST.has(first) ? words[words.length - 1] : words[0]) ?? '';
}

export interface FirstDayState {
  readonly loaded: boolean;
  readonly done: boolean;
  readonly fullName: string | null;
}

let state: FirstDayState = { loaded: false, done: false, fullName: null };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function publish(next: Partial<FirstDayState>): void {
  state = { ...state, ...next };
  for (const listener of [...listeners]) listener();
}

/** Reads whether the first day is done and the name from roll call, once per launch. */
export function loadFirstDay(db: DataDatabase): Promise<void> {
  loading ??= (async () => {
    const done = (await readSetting<boolean>(db, FIRST_DAY_KEYS.done)) === true;
    const fullName = await readSetting<string>(db, FIRST_DAY_KEYS.fullName);
    publish({ loaded: true, done, fullName });
  })().catch(() => {
    loading = null;
    publish({ loaded: true });
  });
  return loading;
}

/** Keeps the full name from roll call: the name he shouts at the top of the pressure. */
export async function saveFullName(db: DataDatabase, typed: string): Promise<string> {
  const fullName = tidyName(typed);
  await writeSetting(db, FIRST_DAY_KEYS.fullName, fullName === '' ? null : fullName);
  publish({ fullName: fullName === '' ? null : fullName });
  return fullName;
}

export async function markFirstDayDone(db: DataDatabase): Promise<void> {
  await writeSetting(db, FIRST_DAY_KEYS.done, true);
  publish({ done: true });
}

/** After everything is deleted: a new student, and the first day again. */
export function forgetFirstDay(): void {
  loading = null;
  publish({ loaded: true, done: false, fullName: null });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;

/** The first day as the app knows it: done or not, and the student's name. */
export function useFirstDay(): FirstDayState {
  const db = useSQLiteContext();
  useEffect(() => {
    void loadFirstDay(db);
  }, [db]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The student's full name for his lines (`{NAME}`), and the given name (`{name}`). */
export function useStudentName(): { readonly full: string | null; readonly given: string | null } {
  const { fullName } = useFirstDay();
  return { full: fullName, given: fullName === null ? null : givenNameOf(fullName) };
}
