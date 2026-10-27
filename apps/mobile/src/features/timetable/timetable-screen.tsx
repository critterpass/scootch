import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { addDays, momentAt, weekdayOf } from '@phusclass/domain/board';

import { useLanguage } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { goBack } from '../../ui/motion/go-back';
import { timetablePull } from '../../ui/motion/hand-off';
import { useMayMove } from '../../ui/motion/use-feel';
import { useCareGuard } from '../care/use-care-guard';
import { lineFor } from '../desk/his-line';
import { useStudentName } from '../desk/use-student-name';
import { useTuition } from '../tuition/tuition-provider';

import { useBookings } from './bookings';
import { phoneCalendar, type CalendarAccess } from './calendar-port';
import { freePicks, isWeekend, schoolDay, type CalendarEvent } from './periods';
import { TimetableFrame } from './timetable-frame';
import { TimetableView, type StripDay, type TimetableBody } from './timetable-view';

/** The week the timetable shows: Monday to Sunday around the day. */
export function weekOf(day: string, today: string, language: 'en' | 'vi'): StripDay[] {
  const monday = addDays(day, -((weekdayOf(day) + 6) % 7));
  const locale = language === 'vi' ? 'vi-VN' : 'en-GB';
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const at = Date.parse(`${date}T12:00:00Z`);
    const weekday = weekdayOf(date);
    return {
      date,
      letter:
        language === 'vi'
          ? weekday === 0
            ? 'CN'
            : `T${weekday + 1}`
          : new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(at),
      number: String(Number(date.slice(8, 10))),
      spoken: new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(at),
      selected: date === day,
      weekend: weekday === 0 || weekday === 6,
    };
  });
}

/** A sample day drawn faintly behind the lock: the shape of a timetable, no one's calendar. */
const SAMPLE_DAY = schoolDay([
  { id: 'a', title: '', start: 8 * 60, end: 8 * 60 + 30, allDay: false, location: null },
  { id: 'b', title: '', start: 10 * 60, end: 11 * 60, allDay: false, location: null },
  { id: 'c', title: '', start: 12 * 60 + 30, end: 13 * 60 + 30, allDay: false, location: null },
  { id: 'd', title: '', start: 15 * 60, end: 15 * 60 + 45, allDay: false, location: null },
]);

/**
 * The timetable on the phone's calendar and the board. Without tuition it is the quiet lock. With
 * it, the calendar is asked for the first time the timetable opens, never before; after that the
 * chosen day's events become periods, and each free period gets his pick from the board.
 */
export function TimetableScreen() {
  const crisis = useCareGuard();
  const router = useRouter();
  const mayMove = useMayMove();
  const { language } = useLanguage();
  const snapshot = useBoard();
  const store = useBoardStore();
  const name = useStudentName();
  const tuition = useTuition();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = snapshot.now.day;
  const [day, setDay] = useState(today);
  const [access, setAccess] = useState<CalendarAccess | null>(null);
  // The events of the day on show: a newly picked day keeps the old one up until its own arrive.
  const [loaded, setLoaded] = useState<{ day: string; events: CalendarEvent[] } | null>(null);
  const shown = loaded?.day ?? day;
  const events = loaded?.events ?? null;
  const { bookings, book } = useBookings(shown);

  useEffect(() => {
    if (!tuition.enrolled) return;
    void phoneCalendar
      .access()
      .then(setAccess)
      .catch(() => setAccess('denied'));
  }, [tuition.enrolled]);

  useEffect(() => {
    if (access !== 'granted') return undefined;
    let current = true;
    void phoneCalendar
      .day(day, timeZone)
      .then((found) => {
        if (current) setLoaded({ day, events: found });
      })
      .catch(() => {
        if (current) setLoaded({ day, events: [] });
      });
    return () => {
      current = false;
    };
  }, [access, day, timeZone]);

  const close = useCallback(() => goBack(router, '/'), [router]);

  const body = useMemo((): TimetableBody => {
    if (!tuition.enrolled) return { kind: 'locked', sample: SAMPLE_DAY };
    if (access === null) return { kind: 'loading' };
    if (access === 'undetermined') {
      return { kind: 'ask', line: lineFor(language, 'timetableAsk', today)?.text ?? '' };
    }
    if (access === 'denied') return { kind: 'denied' };
    if (events === null) return { kind: 'loading' };
    const school = schoolDay(events);
    const tasks = snapshot.board.map((ranked) => ranked.task);
    const at = momentAt(Date.parse(`${shown}T12:00:00Z`), 'UTC');
    const moment = shown === today ? snapshot.now : at;
    if (isWeekend(weekdayOf(shown), school)) {
      const pick = freePicks(school, tasks, moment, null)[0]?.task ?? null;
      const line =
        pick === null
          ? null
          : (lineFor(language, 'timetableWeekend', `${shown}:${pick.id}`, { task: pick.text })
              ?.text ?? null);
      return { kind: 'weekend', task: pick, line };
    }
    const nowMinutes = shown === today ? snapshot.now.minuteOfDay : null;
    return {
      kind: 'day',
      day: school,
      picks: freePicks(school, tasks, moment, nowMinutes),
      bookings,
      nowMinutes,
    };
  }, [tuition.enrolled, access, events, snapshot, shown, today, language, bookings]);

  if (crisis) return null;

  return (
    <TimetableFrame
      progress={timetablePull}
      snapshot={snapshot}
      name={name}
      mayMove={mayMove}
      onClosed={close}
      overDesk
    >
      {(settleHome) => (
        <TimetableView
          days={weekOf(day, today, language)}
          body={body}
          bodyKey={`${shown}:${body.kind}`}
          onPickDay={setDay}
          onAsk={() =>
            void phoneCalendar
              .ask()
              .then(setAccess)
              .catch(() => setAccess('denied'))
          }
          onNotNow={settleHome}
          onOpenSettings={() => void Linking.openSettings()}
          onBook={book}
          onToDesk={(taskId) => {
            void store.swap(taskId);
            settleHome();
          }}
        />
      )}
    </TimetableFrame>
  );
}
