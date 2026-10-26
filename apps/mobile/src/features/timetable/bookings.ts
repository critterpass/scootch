import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { readKv, writeKv } from '../../data/kv-repository';

/** One day's bookings: a free period's id and the task booked into it. Kept in the app only. */
export type Bookings = Readonly<Record<string, string>>;

const keyOf = (date: string) => `timetable.booked.${date}`;

/** Reads a day's bookings as stored; anything unreadable is none. */
export function bookingsFrom(stored: string | null): Bookings {
  if (stored === null) return {};
  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

/** Books a task into a period, or takes the booking off when that task is already there. */
export function toggled(bookings: Bookings, periodId: string, taskId: string): Bookings {
  const next: Record<string, string> = { ...bookings };
  if (next[periodId] === taskId) delete next[periodId];
  else next[periodId] = taskId;
  return next;
}

/**
 * A day's bookings, kept on the phone. Booking is the app's own note of what goes in a free
 * period: it never writes to the calendar.
 */
export function useBookings(date: string): {
  readonly bookings: Bookings;
  readonly book: (periodId: string, taskId: string) => void;
} {
  const db = useSQLiteContext();
  const [bookings, setBookings] = useState<Bookings>({});
  useEffect(() => {
    let current = true;
    void readKv(db, keyOf(date))
      .then((stored) => {
        if (current) setBookings(bookingsFrom(stored));
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db, date]);
  const book = useCallback(
    (periodId: string, taskId: string) => {
      setBookings((before) => {
        const next = toggled(before, periodId, taskId);
        void writeKv(db, keyOf(date), JSON.stringify(next), Date.now()).catch(() => undefined);
        return next;
      });
    },
    [db, date],
  );
  return { bookings, book };
}
