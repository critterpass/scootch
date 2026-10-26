import { momentAt } from '@phusclass/domain/board';
import { useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { useLanguage } from '../../i18n/i18n-provider';
import { fixtureSnapshot, FIXTURE_NAME, FIXTURE_NOW } from '../desk/class-fixtures';
import { lineFor } from '../desk/his-line';

import { freePicks, schoolDay, type CalendarEvent } from './periods';
import { TimetableFrame } from './timetable-frame';
import { weekOf } from './timetable-screen';
import { TimetableView, type TimetableBody } from './timetable-view';

/**
 * The timetable for the registry's captures: the App board's Monday (a run before school, a
 * design review, lunch with Linh, the dentist at three) on the classroom fixtures' board, at ten
 * past eight. Nothing here is used by the app.
 */
const ZONE = 'Asia/Ho_Chi_Minh';

const EVENTS: Readonly<Record<'en' | 'vi', readonly CalendarEvent[]>> = {
  en: [
    {
      id: 'run',
      title: 'Morning run',
      start: 7 * 60,
      end: 7 * 60 + 30,
      allDay: false,
      location: null,
    },
    {
      id: 'review',
      title: 'Design review',
      start: 10 * 60,
      end: 11 * 60,
      allDay: false,
      location: null,
    },
    {
      id: 'lunch',
      title: 'Lunch with Linh',
      start: 12 * 60 + 30,
      end: 13 * 60 + 30,
      allDay: false,
      location: null,
    },
    {
      id: 'dentist',
      title: 'Dentist',
      start: 15 * 60,
      end: 15 * 60 + 45,
      allDay: false,
      location: 'Quận 3',
    },
  ],
  vi: [
    {
      id: 'run',
      title: 'Chạy bộ buổi sáng',
      start: 7 * 60,
      end: 7 * 60 + 30,
      allDay: false,
      location: null,
    },
    {
      id: 'review',
      title: 'Họp duyệt thiết kế',
      start: 10 * 60,
      end: 11 * 60,
      allDay: false,
      location: null,
    },
    {
      id: 'lunch',
      title: 'Ăn trưa với Linh',
      start: 12 * 60 + 30,
      end: 13 * 60 + 30,
      allDay: false,
      location: null,
    },
    {
      id: 'dentist',
      title: 'Nha sĩ',
      start: 15 * 60,
      end: 15 * 60 + 45,
      allDay: false,
      location: 'Quận 3',
    },
  ],
};

export type TimetableCase = 'day' | 'booked' | 'ask' | 'weekend' | 'locked';

const noop = () => undefined;

export function TimetableFixture({ which }: { readonly which: TimetableCase }) {
  const { language } = useLanguage();
  const progress = useSharedValue(1);
  const snapshot = useMemo(() => fixtureSnapshot({ language, waited: 1, slips: 3 }), [language]);
  const today = momentAt(FIXTURE_NOW, ZONE).day;
  const shown = which === 'weekend' ? '2026-10-31' : today;
  const body = useMemo((): TimetableBody => {
    const tasks = snapshot.board.map((ranked) => ranked.task);
    switch (which) {
      case 'ask':
        return { kind: 'ask', line: lineFor(language, 'timetableAsk', today)?.text ?? '' };
      case 'locked':
        return { kind: 'locked', sample: schoolDay(EVENTS.en) };
      case 'weekend': {
        const task = freePicks(schoolDay([]), tasks, snapshot.now, null)[0]?.task ?? null;
        const line =
          task === null
            ? null
            : (lineFor(language, 'timetableWeekend', `fixture:${task.id}`, { task: task.text })
                ?.text ?? null);
        return { kind: 'weekend', task, line };
      }
      case 'day':
      case 'booked': {
        const day = schoolDay(EVENTS[language]);
        const nowMinutes = 8 * 60 + 10;
        const picks = freePicks(day, tasks, snapshot.now, nowMinutes);
        const first = picks[0];
        return {
          kind: 'day',
          day,
          picks,
          bookings: which === 'booked' && first?.task ? { [first.period.id]: first.task.id } : {},
          nowMinutes,
        };
      }
    }
  }, [which, language, snapshot, today]);

  return (
    <TimetableFrame
      progress={progress}
      snapshot={snapshot}
      name={FIXTURE_NAME}
      mayMove={false}
      onClosed={noop}
    >
      <TimetableView
        days={weekOf(shown, today, language)}
        body={body}
        onPickDay={noop}
        onAsk={noop}
        onNotNow={noop}
        onOpenSettings={noop}
        onBook={noop}
        onToDesk={noop}
      />
    </TimetableFrame>
  );
}
