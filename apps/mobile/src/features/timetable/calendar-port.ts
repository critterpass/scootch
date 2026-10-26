import {
  getCalendarPermissions,
  getCalendars,
  listEvents,
  requestCalendarPermissions,
} from 'expo-calendar';

import { localDateTime } from '@phusclass/domain';

import type { CalendarEvent } from './periods';

/** Where calendar access stands: asked and given, asked and refused, or never asked. */
export type CalendarAccess = 'granted' | 'denied' | 'undetermined';

/**
 * The phone's calendars, read only. Events are read on the phone for one day at a time and never
 * leave it; nothing here writes, moves or deletes anything in a calendar.
 */
export interface CalendarPort {
  access(): Promise<CalendarAccess>;
  /** Shows the system's question. Asked only from the timetable, never at first launch. */
  ask(): Promise<CalendarAccess>;
  /** The day's events from every calendar, on the person's clock. */
  day(date: string, timeZone: string): Promise<CalendarEvent[]>;
}

function accessOf(status: string, canAskAgain: boolean): CalendarAccess {
  if (status === 'granted') return 'granted';
  return status === 'undetermined' || (status !== 'denied' && canAskAgain)
    ? 'undetermined'
    : 'denied';
}

const minutesInto = (date: string, at: Date, timeZone: string): number => {
  const local = localDateTime(at.getTime(), timeZone);
  if (local.date < date) return 0;
  if (local.date > date) return 24 * 60;
  return local.hour * 60 + local.minute;
};

export const phoneCalendar: CalendarPort = {
  access: async () => {
    const found = await getCalendarPermissions();
    return accessOf(found.status, found.canAskAgain);
  },
  ask: async () => {
    const found = await requestCalendarPermissions();
    return accessOf(found.status, found.canAskAgain);
  },
  day: async (date, timeZone) => {
    const calendars = await getCalendars();
    if (calendars.length === 0) return [];
    // The whole wall-clock day, with a margin either side for zones; events are cut to the day.
    const from = new Date(`${date}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 1);
    const to = new Date(`${date}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 2);
    const events = await listEvents(calendars, from, to);
    return events
      .map((event) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return {
          id: String(event.id),
          title: event.title,
          start: minutesInto(date, start, timeZone),
          end: minutesInto(date, end, timeZone),
          allDay: event.allDay,
          location: event.location ?? null,
        };
      })
      .filter((event) => event.end > event.start && event.end > 0 && event.start < 24 * 60);
  },
};
