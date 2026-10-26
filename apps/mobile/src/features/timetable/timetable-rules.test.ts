import { describe, expect, it } from '@jest/globals';

import { DAY_MS, momentAt, newTask, type Task } from '@phusclass/domain/board';

import { arcPath, degreesAt, dialArcs, freeAhead, knobAt, pointAt } from './dial-math';
import { freePicks, isWeekend, schoolDay, subjectOf, type CalendarEvent } from './periods';

const at = (clock: string) => {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

function event(title: string, from: string, to: string, over: Partial<CalendarEvent> = {}) {
  return {
    id: `${title}-${from}`,
    title,
    start: at(from),
    end: at(to),
    allDay: false,
    location: null,
    ...over,
  } satisfies CalendarEvent;
}

/** The App board's Monday: a design review, lunch with Linh, and the dentist at three. */
const monday = [
  event('Morning run', '07:00', '07:30'),
  event('Design review', '10:00', '11:00'),
  event('Lunch with Linh', '12:30', '13:30'),
  event('Dentist', '15:00', '15:45', { location: 'Nha khoa Kim, Quận 3' }),
  event('Public holiday', '00:00', '23:59', { allDay: true }),
];

describe('the day as a timetable', () => {
  it('files each event under a school subject by its kind, in either language', () => {
    expect(subjectOf('Morning run')).toBe('pe');
    expect(subjectOf('Chạy bộ hồ Tây')).toBe('pe');
    expect(subjectOf('Team meeting')).toBe('homeroom');
    expect(subjectOf('Họp nhóm')).toBe('homeroom');
    expect(subjectOf('Lunch with Linh')).toBe('recess');
    expect(subjectOf('Ăn trưa với Linh')).toBe('recess');
    expect(subjectOf('Dentist')).toBe('biology');
    expect(subjectOf('Pick up the parcel')).toBe('elective');
    // A word inside another is not the word: "Brunei" is not brunch, "scall" is not a call.
    expect(subjectOf('Trip to Brunei')).toBe('geography');
  });

  it('splits the day into a morning and an afternoon half at recess, numbering each half', () => {
    const day = schoolDay(monday);
    expect(day.morning.map((one) => [one.number, one.kind, one.start])).toEqual([
      [1, 'class', at('07:00')],
      [2, 'free', at('07:30')],
      [3, 'class', at('10:00')],
      [4, 'free', at('11:00')],
    ]);
    expect(day.afternoon.map((one) => [one.number, one.kind, one.start])).toEqual([
      [1, 'free', at('12:00')],
      [2, 'class', at('12:30')],
      [3, 'free', at('13:30')],
      [4, 'class', at('15:00')],
      [5, 'free', at('15:45')],
    ]);
  });

  it('makes the gaps free periods, and leaves out a gap too short to be one', () => {
    const day = schoolDay([event('Stand-up', '09:00', '09:15'), event('Call', '09:35', '10:00')]);
    expect(day.free.map((one) => [one.start, one.end])).toEqual([
      [at('07:00'), at('09:00')],
      [at('10:00'), at('12:00')],
      [at('12:00'), at('17:00')],
    ]);
  });

  it('ends class early before an event with somewhere to get to', () => {
    const day = schoolDay(monday);
    const dentist = day.afternoon.find((one) => one.kind === 'class' && one.title === 'Dentist');
    expect(dentist).toMatchObject({ classEndsAt: at('14:30'), subject: 'biology' });
    const before = day.free.find((one) => one.start === at('13:30'));
    expect(before?.end).toBe(at('14:30'));
  });

  it('leaves all-day events out of the periods', () => {
    const day = schoolDay([event('Holiday', '00:00', '23:59', { allDay: true })]);
    expect([...day.morning, ...day.afternoon].every((one) => one.kind === 'free')).toBe(true);
  });

  it('shows the weekend only on a Saturday or Sunday with no classes', () => {
    expect(isWeekend(6, schoolDay([]))).toBe(true);
    expect(isWeekend(0, schoolDay([event('Run', '08:00', '09:00')]))).toBe(false);
    expect(isWeekend(1, schoolDay([]))).toBe(false);
  });
});

describe('his pick for each free period', () => {
  const now = momentAt(Date.parse('2026-10-26T01:00:00Z'), 'Asia/Ho_Chi_Minh');
  const task = (id: string, text: string, over: Partial<Task> = {}): Task => ({
    ...newTask({ id, text, at: now.at - 5 * DAY_MS }),
    ...over,
  });

  it('goes down his board order and fits each period, never picking one task twice', () => {
    const day = schoolDay(monday);
    const tasks = [
      task('dentist', 'Email the dentist', { dueDate: '2026-10-26' }),
      task('tax', 'Tax receipts', { order: { minutes: 45, swappedAt: null } }),
      task('passport', 'Renew passport', { order: { minutes: 120, swappedAt: null } }),
    ];
    const picks = freePicks(day, tasks, now, at('08:00'));
    expect(picks.map((one) => [one.period.start, one.task?.id ?? null])).toEqual([
      [at('07:30'), 'dentist'],
      [at('11:00'), 'tax'],
      [at('12:00'), null],
      [at('13:30'), null],
      [at('15:45'), null],
    ]);
  });

  it('gives a period that has begun only the minutes left in it, and none to one gone', () => {
    const day = schoolDay(monday);
    const tasks = [task('long', 'Long thing', { order: { minutes: 90, swappedAt: null } })];
    const picks = freePicks(day, tasks, now, at('09:00'));
    expect(picks[0]?.period.start).toBe(at('07:30'));
    expect(picks[0]?.task).toBeNull();
    expect(freePicks(day, tasks, now, at('11:30')).map((one) => one.period.start)).toEqual([
      at('11:00'),
      at('12:00'),
      at('13:30'),
      at('15:45'),
    ]);
  });

  it('never picks a task flagged crisis', () => {
    const day = schoolDay([]);
    const picks = freePicks(day, [task('heavy', 'x', { care: 'crisis' })], now, null);
    expect(picks.every((one) => one.task === null)).toBe(true);
  });
});

describe('the day dial', () => {
  it('lays seven to five round 300 degrees, thirty an hour, gap at the bottom', () => {
    expect(degreesAt(7)).toBe(-150);
    expect(degreesAt(12)).toBe(0);
    expect(degreesAt(17)).toBe(150);
    const top = pointAt(94, 0);
    expect(top.x).toBeCloseTo(120);
    expect(top.y).toBeCloseTo(26);
  });

  it('draws an arc on the ring between two hours, the long way round when it must', () => {
    expect(arcPath(12, 13)).toBe('M120.0 26.0 A94 94 0 0 1 167.0 38.6');
    expect(arcPath(7, 17)).toContain(' 0 1 1 ');
  });

  it('colours classes, free periods and booked ones, and fades what is over', () => {
    const day = schoolDay(monday);
    const arcs = dialArcs(day, new Set(['free-450']), at('10:30'));
    const byKey = new Map(arcs.map((arc) => [arc.key, arc]));
    expect(byKey.get('free-450')).toMatchObject({ kind: 'booked', past: true, breathing: false });
    expect(byKey.get('free-660')).toMatchObject({ kind: 'free', past: false, breathing: true });
    expect(byKey.get('Design review-10:00')).toMatchObject({ kind: 'class', past: false });
    expect(byKey.get('Morning run-07:00')).toMatchObject({ kind: 'class', past: true });
  });

  it('puts the knob at the time now, held to the ends of the day', () => {
    expect(knobAt(at('12:00'))).toEqual(pointAt(94, 0));
    expect(knobAt(at('05:00'))).toEqual(pointAt(94, -150));
    expect(knobAt(at('21:00'))).toEqual(pointAt(94, 150));
  });

  it('counts the free periods still to come for its caption', () => {
    const day = schoolDay(monday);
    expect(freeAhead(day, at('08:00'))).toBe(5);
    expect(freeAhead(day, at('16:00'))).toBe(1);
    expect(freeAhead(day, null)).toBe(5);
  });
});
