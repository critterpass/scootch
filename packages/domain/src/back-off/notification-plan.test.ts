import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Attitude } from '../contracts';
import {
  MINUTE_MS,
  addDays,
  instantOfLocal,
  isoFromInstant,
  localDateTime,
  scootchDayOf,
  scootchDayStart,
} from '../day';
import { TODAY } from '../day/test/rows';

import {
  NOTIFICATION_SPACING_MINUTES,
  NOTIFICATION_VOLUMES,
  dailyNotificationLimit,
  ignoredDaysBefore,
  isQuietMinute,
  notificationPlan,
  type NotificationPlanInput,
  type TimedNotification,
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

describe('a cue and a get-ready nudge', () => {
  const on = (clock: string, days = 0) =>
    instantOfLocal(addDays(TODAY, days), clock, base.timeZone);
  const cue = (clock: string, days = 0): TimedNotification => ({
    kind: 'cue',
    at: on(clock, days),
  });
  const getReady = (clock: string): TimedNotification => ({ kind: 'get_ready', at: on(clock) });
  /** What the day holds, in the order it is sent: the clock time, and which message it is. */
  const day = (over: Partial<NotificationPlanInput>) =>
    plan(over).notifications.map((one) => {
      const local = localDateTime(one.at, base.timeZone);
      const clock = `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
      return `${clock} ${one.kind ?? `line ${one.ordinal}`}`;
    });

  it('at Soft, a cue is the one message of the day', () => {
    expect(day({ attitude: 'soft' })).toEqual(['13:10 line 0']);
    expect(day({ attitude: 'soft', timed: [cue('16:45')] })).toEqual(['16:45 cue']);
    expect(plan({ attitude: 'soft', timed: [cue('16:45')] }).notifications).toEqual([
      { at: on('16:45'), ordinal: 0, volume: 'soft', loudness: 1, kind: 'cue' },
    ]);
  });

  it('takes a place at the other attitudes too: the day holds three with it, as without', () => {
    expect(day({ attitude: 'cheeky' })).toEqual(['13:10 line 0', '13:55 line 1', '14:40 line 2']);
    expect(day({ attitude: 'cheeky', timed: [cue('17:30')] })).toEqual([
      '13:10 line 0',
      '13:55 line 1',
      '17:30 cue',
    ]);
    // The cue and the nudge together leave one of the day's own lines.
    expect(day({ timed: [cue('17:30'), getReady('10:25')] })).toEqual([
      '10:25 get_ready',
      '13:10 line 0',
      '17:30 cue',
    ]);
    // The place taken is the last of the day's lines, which is the one left unsent.
    expect(plan({ attitude: 'cheeky', timed: [cue('17:30')] }).notifications.at(-1)).toMatchObject({
      kind: 'cue',
      ordinal: 2,
      volume: 'cheeky',
      loudness: 1,
    });
  });

  it('is sent at its own time, and the lines of the day keep their distance from it', () => {
    // Twenty minutes after the usual start: the first line waits until 45 minutes after the cue.
    expect(day({ timed: [cue('13:30')] })).toEqual(['13:30 cue', '14:15 line 0', '15:00 line 1']);
    // Well before the usual start, nothing has to move.
    expect(day({ timed: [cue('09:00')] })).toEqual(['09:00 cue', '13:10 line 0', '13:55 line 1']);
    // Between two of them, the later line makes room.
    expect(day({ timed: [cue('14:10')] })).toEqual(['13:10 line 0', '14:10 cue', '14:55 line 1']);
  });

  it('waits for quiet hours to end when they end on the same day', () => {
    // Coffee at eight, quiet until half past.
    expect(day({ attitude: 'soft', timed: [cue('08:00')] })).toEqual(['08:30 cue']);
    expect(plan({ attitude: 'soft', timed: [cue('08:00')] }).notifications[0]?.at).toBe(
      on('08:30'),
    );
  });

  it('is dropped when quiet hours last until the day is over, and the day is as it was', () => {
    // Ten at night: quiet until 08:30, by when the Scootch day has rolled over.
    expect(day({ attitude: 'soft', timed: [cue('22:00')] })).toEqual(['13:10 line 0']);
    expect(plan({ timed: [cue('22:00')] })).toStrictEqual(plan({}));
    expect(plan({ timed: [cue('01:30', 1)] })).toStrictEqual(plan({}));
  });

  it('is sent in the small hours when the user keeps no quiet hours then', () => {
    const lateNights = { start: '02:00', end: '08:30' };
    expect(day({ attitude: 'soft', quietHours: lateNights, timed: [cue('01:30', 1)] })).toEqual([
      '01:30 cue',
    ]);
  });

  it('is not sent on a day that is not its own', () => {
    expect(plan({ timed: [cue('13:10', 1)] })).toStrictEqual(plan({}));
    expect(plan({ timed: [cue('03:30')] })).toStrictEqual(plan({}));
  });

  it.each([4, 5, 9, 10, 30])('sends none after %i ignored days, a silent day', (ignoredDays) => {
    for (const attitude of ['soft', 'cheeky', 'unhinged'] as const) {
      const silent = plan({ attitude, ignoredDays, timed: [cue('16:45'), getReady('10:25')] });
      expect(silent.notifications).toEqual([]);
    }
  });

  it('follows the back-off like any other: one place left, one message', () => {
    expect(day({ ignoredDays: 2, timed: [cue('16:45')] })).toEqual(['16:45 cue']);
    expect(day({ ignoredDays: 1, timed: [cue('16:45')] })).toEqual(['13:10 line 0', '16:45 cue']);
    // The week's one soft note, on the day it is due, is the cue.
    expect(day({ ignoredDays: 11, timed: [cue('16:45')] })).toEqual(['16:45 cue']);
  });

  it('sends the get-ready nudge once, from Scootch, and never late', () => {
    expect(plan({ attitude: 'soft', timed: [getReady('14:25')] }).notifications).toEqual([
      { at: on('14:25'), ordinal: 0, volume: 'soft', loudness: 1, kind: 'get_ready' },
    ]);
    // Inside quiet hours it is not moved to their end: by then it would not be true.
    expect(plan({ timed: [getReady('08:00')] })).toStrictEqual(plan({}));
    // Said twice, it is still one.
    expect(
      day({ timed: [getReady('14:25'), getReady('16:00')] }).filter((one) => /get/.test(one)),
    ).toEqual(['14:25 get_ready']);
  });

  it('gives the one place of a Soft day to the nudge, and a cue too close to it gives way', () => {
    expect(day({ attitude: 'soft', timed: [cue('13:10'), getReady('14:25')] })).toEqual([
      '14:25 get_ready',
    ]);
    expect(day({ timed: [cue('14:00'), getReady('14:25')] })).toEqual([
      '13:10 line 0',
      '14:25 get_ready',
      '15:10 line 1',
    ]);
  });

  it('gives a serious task a plain cue at the soft volume, signed by no monster', () => {
    const serious = plan({ attitude: 'soft', plain: true, timed: [cue('16:45')] });
    expect(serious.notifications).toEqual([
      { at: on('16:45'), ordinal: 0, volume: 'soft', loudness: 1, kind: 'cue', plain: true },
    ]);
    // Whatever the attitude, it is never louder than soft, and an ordinary cue is not marked.
    expect(plan({ plain: true, timed: [cue('16:45')] }).notifications.at(-1)).toMatchObject({
      kind: 'cue',
      volume: 'soft',
      plain: true,
    });
    expect(plan({ timed: [cue('16:45')] }).notifications.at(-1)).not.toHaveProperty('plain');
  });

  const anyTimed = fc
    .record({
      cue: fc.option(fc.integer({ min: -6 * 60, max: 30 * 60 }), { nil: null }),
      getReady: fc.option(fc.integer({ min: -6 * 60, max: 30 * 60 }), { nil: null }),
    })
    .map(({ cue: cueMinute, getReady: readyMinute }) => (start: number): TimedNotification[] => [
      ...(cueMinute === null ? [] : [{ kind: 'cue' as const, at: start + cueMinute * MINUTE_MS }]),
      ...(readyMinute === null
        ? []
        : [{ kind: 'get_ready' as const, at: start + readyMinute * MINUTE_MS }]),
    ]);

  it('never adds a message, breaks the spacing, or sends in quiet hours or on another day', () => {
    fc.assert(
      fc.property(anyInput, anyTimed, fc.boolean(), (input, timedFrom, plain) => {
        const start = scootchDayStart(input.localDate, input.timeZone);
        const timed = timedFrom(start);
        const { notifications } = notificationPlan({ ...input, timed, plain });

        // No more than the attitude allows, and no more than the same day would hold without them.
        const { available: _lines, ...unlimited } = input;
        const without = notificationPlan({
          ...unlimited,
          usualStart: '12:00',
          quietHours: { start: '00:00', end: '00:00' },
        });
        expect(notifications.length).toBeLessThanOrEqual(dailyNotificationLimit(input.attitude));
        expect(notifications.length).toBeLessThanOrEqual(without.notifications.length);

        const times = notifications.map((one) => one.at);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        for (const [index, at] of times.entries()) {
          const local = localDateTime(at, input.timeZone);
          expect(isQuietMinute(local.hour * 60 + local.minute, input.quietHours)).toBe(false);
          expect(scootchDayOf(at, input.timeZone)).toBe(input.localDate);
          const before = times[index - 1];
          if (before !== undefined) {
            expect(at - before).toBeGreaterThanOrEqual(NOTIFICATION_SPACING_MINUTES * MINUTE_MS);
          }
        }
        for (const kind of ['cue', 'get_ready'] as const) {
          expect(notifications.filter((one) => one.kind === kind).length).toBeLessThanOrEqual(1);
        }
        for (const one of notifications) {
          // A timed one is sent when it was asked for, or, for a cue, when quiet hours ended.
          const asked = timed.find((wanted) => wanted.kind === one.kind);
          if (one.kind === 'get_ready') expect(one.at).toBe(asked?.at);
          if (one.kind === 'cue') expect(one.at).toBeGreaterThanOrEqual(asked?.at ?? Infinity);
        }
      }),
    );
  });
});
