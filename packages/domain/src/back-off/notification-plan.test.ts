import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Attitude } from '../contracts';
import { addDays, isoFromInstant, localDateTime, scootchDayOf, scootchDayStart } from '../day';
import { TODAY } from '../day/test/rows';

import {
  NOTIFICATION_VOLUMES,
  ignoredDaysBefore,
  isQuietMinute,
  notificationPlan,
  type NotificationPlanInput,
} from './notification-plan';

const quietHours = { start: '21:00', end: '08:30' };
const base: NotificationPlanInput = {
  attitude: 'unhinged',
  ignoredDays: 0,
  localDate: TODAY,
  timeZone: 'Europe/London',
  quietHours,
  usualStart: '13:10',
};
const plan = (over: Partial<NotificationPlanInput>) => notificationPlan({ ...base, ...over });
const clocks = (over: Partial<NotificationPlanInput>) =>
  plan(over).notifications.map(({ at }) => {
    const local = localDateTime(at, over.timeZone ?? base.timeZone);
    return `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
  });

describe('the back-off table from the design board', () => {
  it.each<[Attitude, number, string, number[]]>([
    // Unhinged: day 1 is three at full theatre, louder each time.
    ['unhinged', 0, 'theatre', [1, 2, 3]],
    // One day ignored: two, and a bit sheepish.
    ['unhinged', 1, 'sheepish', [1, 2]],
    // Two days ignored: one a day at Cheeky volume, which holds until the next row.
    ['unhinged', 2, 'cheeky', [1]],
    ['unhinged', 3, 'cheeky', [1]],
    // Four days ignored: silence.
    ['unhinged', 4, 'soft', []],
    ['cheeky', 0, 'cheeky', [1, 1, 1]],
    ['cheeky', 1, 'cheeky', [1, 1]],
    ['cheeky', 2, 'cheeky', [1]],
    ['cheeky', 3, 'cheeky', [1]],
    ['cheeky', 4, 'soft', []],
    ['soft', 0, 'soft', [1]],
    ['soft', 1, 'soft', [1]],
    ['soft', 2, 'soft', [1]],
    ['soft', 3, 'soft', [1]],
    ['soft', 4, 'soft', []],
  ])(
    '%s after %i ignored days: %s volume, loudness %j',
    (attitude, ignoredDays, volume, loudness) => {
      const { notifications } = plan({ attitude, ignoredDays });
      expect(notifications.map((one) => one.loudness)).toEqual(loudness);
      expect(notifications.map((one) => one.ordinal)).toEqual(loudness.map((_, index) => index));
      for (const one of notifications) expect(one.volume).toBe(volume);
    },
  );

  it.each([
    [4, 0],
    [5, 0],
    [10, 0],
    [11, 1],
    [12, 0],
    [17, 0],
    [18, 1],
    [19, 0],
    [25, 1],
    [400, 0],
    [403, 1],
  ])('once silent, day %i of being ignored sends %i soft note', (ignoredDays, count) => {
    for (const attitude of ['soft', 'cheeky', 'unhinged'] as const) {
      const { notifications } = plan({ attitude, ignoredDays });
      expect(notifications.length).toBe(count);
      for (const one of notifications) expect(one).toMatchObject({ volume: 'soft', loudness: 1 });
    }
  });

  it('goes back to day one when the app is opened, with nothing else in the plan', () => {
    expect(ignoredDaysBefore(addDays(TODAY, -30), TODAY)).toBe(29);
    const afterOpening = plan({ ignoredDays: ignoredDaysBefore(TODAY, addDays(TODAY, 1)) });
    expect(afterOpening).toStrictEqual(plan({ ignoredDays: 0 }));
    expect(afterOpening.notifications.length).toBe(3);
  });

  it.each([
    [null, 0],
    [TODAY, 0],
    [addDays(TODAY, -1), 0],
    [addDays(TODAY, -2), 1],
    [addDays(TODAY, -5), 4],
  ])('with the app last opened on %s, %i days were ignored', (lastOpenedDay, days) => {
    expect(ignoredDaysBefore(lastOpenedDay, TODAY)).toBe(days);
  });

  it('sends no more than the lines the task has', () => {
    expect(plan({ available: 1 }).notifications.length).toBe(1);
    expect(plan({ available: 0 }).notifications.length).toBe(0);
  });
});

describe('when they go out', () => {
  it('starts at the usual hour and spaces the rest 45 minutes apart, on the local clock', () => {
    expect(plan({}).notifications.map((one) => isoFromInstant(one.at))).toEqual([
      '2026-10-06T12:10:00.000Z',
      '2026-10-06T12:55:00.000Z',
      '2026-10-06T13:40:00.000Z',
    ]);
    expect(clocks({})).toEqual(['13:10', '13:55', '14:40']);
  });

  it('keeps the local hour across a clock change', () => {
    const springForward = { localDate: '2026-03-08', timeZone: 'America/New_York' };
    expect(isoFromInstant(plan(springForward).notifications[0]!.at)).toBe(
      '2026-03-08T17:10:00.000Z',
    );
    const dayBefore = { localDate: '2026-03-07', timeZone: 'America/New_York' };
    expect(isoFromInstant(plan(dayBefore).notifications[0]!.at)).toBe('2026-03-07T18:10:00.000Z');
  });

  it.each([
    ['20:59', false],
    ['21:00', true],
    ['23:59', true],
    ['00:00', true],
    ['08:29', true],
    ['08:30', false],
    ['12:00', false],
  ])('%s inside 21:00 to 08:30 quiet hours: %s', (clock, quiet) => {
    const [hour = 0, minute = 0] = clock.split(':').map(Number);
    expect(isQuietMinute(hour * 60 + minute, quietHours)).toBe(quiet);
  });

  it('treats quiet hours within one day the same way, and equal times as none', () => {
    const lunch = { start: '13:00', end: '14:00' };
    expect(
      [12 * 60 + 59, 13 * 60, 13 * 60 + 59, 14 * 60].map((m) => isQuietMinute(m, lunch)),
    ).toEqual([false, true, true, false]);
    expect(isQuietMinute(3 * 60, { start: '00:00', end: '00:00' })).toBe(false);
  });

  it.each<[string, string, string[]]>([
    ['an early riser waits for quiet hours to end', '07:00', ['08:30', '09:15', '10:00']],
    ['the last quiet minute waits one minute', '08:29', ['08:30', '09:15', '10:00']],
    ['the end of quiet hours is not quiet', '08:30', ['08:30', '09:15', '10:00']],
    ['an evening start loses what would land in quiet hours', '20:00', ['20:00', '20:45']],
    ['the start of quiet hours is quiet', '20:15', ['20:15']],
    ['the last minute before quiet hours still goes out', '20:59', ['20:59']],
    ['a usual start inside the evening quiet hours sends nothing', '21:00', []],
    ['the small hours are quiet too', '02:00', []],
  ])('%s: usual start %s sends at %j', (_name, usualStart, sent) => {
    expect(clocks({ usualStart })).toEqual(sent);
  });

  it('moves a start inside daytime quiet hours to their end', () => {
    expect(clocks({ quietHours: { start: '13:00', end: '14:00' } })).toEqual([
      '14:00',
      '14:45',
      '15:30',
    ]);
  });

  it('keeps a small-hours start inside the same Scootch day when no quiet hours are set', () => {
    const none = { start: '00:00', end: '00:00' };
    const { notifications } = plan({ usualStart: '02:00', quietHours: none });
    expect(notifications.map((one) => isoFromInstant(one.at))).toEqual([
      '2026-10-07T01:00:00.000Z',
      '2026-10-07T01:45:00.000Z',
      '2026-10-07T02:30:00.000Z',
    ]);
    // 03:30 would fit; a fourth at 04:15 would belong to the next day.
    expect(clocks({ usualStart: '03:00', quietHours: none })).toEqual(['03:00', '03:45']);
  });
});

const clockTime = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([hour, minute]) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
const anyInput = fc.record({
  attitude: fc.constantFrom<Attitude>('soft', 'cheeky', 'unhinged'),
  ignoredDays: fc.integer({ min: 0, max: 80 }),
  localDate: fc.integer({ min: -400, max: 400 }).map((offset) => addDays(TODAY, offset)),
  // Zones with no clock changes, so a planned wall-clock time always exists.
  timeZone: fc.constantFrom('Asia/Ho_Chi_Minh', 'Asia/Kathmandu', 'America/Phoenix'),
  quietHours: fc.record({ start: clockTime, end: clockTime }),
  usualStart: clockTime,
  available: fc.integer({ min: 0, max: 3 }),
});
const limits = { soft: 1, cheeky: 3, unhinged: 3 };
const ceilings = { soft: 'soft', cheeky: 'cheeky', unhinged: 'theatre' } as const;
const rank = (volume: (typeof NOTIFICATION_VOLUMES)[number]) =>
  NOTIFICATION_VOLUMES.indexOf(volume);

describe('notification plan properties', { timeout: 60_000 }, () => {
  it('never exceeds the attitude, never pings in quiet hours and stays inside the day', () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const { notifications } = notificationPlan(input);
        expect(notifications.length).toBeLessThanOrEqual(limits[input.attitude]);
        expect(notifications.length).toBeLessThanOrEqual(input.available);
        let previous = Number.NEGATIVE_INFINITY;
        for (const one of notifications) {
          const local = localDateTime(one.at, input.timeZone);
          expect(isQuietMinute(local.hour * 60 + local.minute, input.quietHours)).toBe(false);
          expect(scootchDayOf(one.at, input.timeZone)).toBe(input.localDate);
          expect(one.at).toBeGreaterThanOrEqual(scootchDayStart(input.localDate, input.timeZone));
          expect(one.at).toBeGreaterThan(previous);
          expect(rank(one.volume)).toBeLessThanOrEqual(rank(ceilings[input.attitude]));
          previous = one.at;
        }
      }),
    );
  });

  it('only ever turns down as ignored days add up, until it is silent', () => {
    fc.assert(
      fc.property(anyInput, fc.integer({ min: 0, max: 9 }), (input, ignoredDays) => {
        const today = notificationPlan({ ...input, ignoredDays }).notifications;
        const tomorrow = notificationPlan({ ...input, ignoredDays: ignoredDays + 1 }).notifications;
        expect(tomorrow.length).toBeLessThanOrEqual(today.length);
        const loudest = (list: typeof today) =>
          Math.max(-1, ...list.map((one) => rank(one.volume)));
        expect(loudest(tomorrow)).toBeLessThanOrEqual(loudest(today));
        if (ignoredDays + 1 >= 4) expect(tomorrow).toEqual([]);
      }),
    );
  });

  it('holds nothing but a time, a line number and a volume: no count of days ignored', () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const result = notificationPlan(input);
        expect(Object.keys(result)).toEqual(['notifications']);
        for (const one of result.notifications) {
          expect(Object.keys(one).sort()).toEqual(['at', 'loudness', 'ordinal', 'volume']);
          expect(one.loudness).toBeLessThanOrEqual(3);
          expect(one.ordinal).toBeLessThan(3);
        }
      }),
    );
  });

  it('is at most one soft note in any week once it has gone silent', () => {
    fc.assert(
      fc.property(anyInput, fc.integer({ min: 4, max: 300 }), (input, from) => {
        let sent = 0;
        for (let day = from; day < from + 7; day += 1) {
          const { notifications } = notificationPlan({ ...input, ignoredDays: day });
          sent += notifications.length;
          for (const one of notifications) expect(one.volume).toBe('soft');
        }
        expect(sent).toBeLessThanOrEqual(1);
      }),
    );
  });
});
