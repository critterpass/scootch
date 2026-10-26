import { useEffect, useState } from 'react';

import { MINUTE_MS, dayStartOf, type Instant, type Moment } from '@phusclass/domain/board';

import type { BoardSnapshot } from '../../state/board-view';
import { phoneCalendar } from '../timetable/calendar-port';
import { freePicks, schoolDay, type CalendarEvent, type SchoolDay } from '../timetable/periods';

import { setSurfaceTimetable } from './surface-inputs';
import type { SurfaceTimetable } from './surface-snapshot';

/** Midnight of the class day on the wall clock: the day starts at the rollover, after it. */
export function midnightOf(now: Moment): Instant {
  return dayStartOf(now) - (now.rolloverMinute ?? 0) * MINUTE_MS;
}

/**
 * Today's timetable as the widgets draw it, made by the timetable's own rules: the calendar's
 * classes as busy blocks, the free periods, and the next free period still to come with his pick
 * for it. Minutes on the wall clock become instants from `midnight`.
 */
export function surfaceTimetableOf(
  day: SchoolDay,
  board: BoardSnapshot,
  midnight: Instant,
): SurfaceTimetable {
  const at = (minutes: number) => midnight + minutes * MINUTE_MS;
  const periods = [...day.morning, ...day.afternoon];
  const tasks = board.board.map((ranked) => ranked.task);
  const next = freePicks(day, tasks, board.now, board.now.minuteOfDay)[0] ?? null;
  return {
    blocks: periods
      .filter((period) => period.kind === 'class')
      .map((period) => ({ start: at(period.start), end: at(period.end) })),
    free: day.free.map((period) => ({ start: at(period.start), end: at(period.end) })),
    nextFree:
      next === null
        ? null
        : {
            start: at(Math.max(next.period.start, board.now.minuteOfDay)),
            end: at(next.period.end),
            task: next.task === null || next.task.care !== 'none' ? null : next.task.text,
          },
  };
}

/**
 * Keeps the widgets' timetable in step while tuition is paid and the calendar may be read: the day
 * is read from the phone's calendar when the app comes to the front, and the next free period is
 * worked out again as the minutes pass. Events never leave the phone; the App Group is on it.
 */
export function useSurfaceTimetable(
  board: BoardSnapshot,
  enrolled: boolean,
  foreground: boolean,
): void {
  const day = board.now.day;
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    if (!enrolled || !foreground) return undefined;
    let current = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void phoneCalendar
      .access()
      .then((access) => (access === 'granted' ? phoneCalendar.day(day, timeZone) : null))
      .then((found) => {
        if (current) setEvents(found);
      })
      .catch(() => {
        if (current) setEvents(null);
      });
    return () => {
      current = false;
    };
  }, [enrolled, foreground, day]);

  const ready = board.phase !== 'loading';
  const minute = board.now.minuteOfDay;
  const order = board.board;
  useEffect(() => {
    if (!enrolled || events === null || !ready) {
      setSurfaceTimetable(null);
      return;
    }
    setSurfaceTimetable(surfaceTimetableOf(schoolDay(events), board, midnightOf(board.now)));
    // Worked out again when the minute or the board's order changes, not on every tick.
  }, [enrolled, events, ready, minute, order]);
}
