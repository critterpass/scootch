import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DAY_MS, HOUR_MS, MINUTE_MS, instantFromIso } from '../day';

import {
  MIN_SESSIONS_TO_LEARN,
  completionByLength,
  learnHabits,
  usualStartHour,
  type PastSession,
} from './habits';

/** A zone whose clocks never change, so a session at 13:00 stays at 13:00 all year. */
const HOME = 'Asia/Ho_Chi_Minh';
/** Midnight there on Monday 5 October 2026 (UTC+7). */
const midnight = instantFromIso('2026-10-05T00:00:00+07:00');

/** `count` sessions on consecutive days from `fromDay`, at `hour` and a few minutes. */
function sessions(
  count: number,
  hour: number,
  plannedMinutes: number,
  finishedCount: number,
  fromDay = 0,
): PastSession[] {
  return Array.from({ length: count }, (_, index) => ({
    startedAt: midnight + (fromDay + index) * DAY_MS + hour * HOUR_MS + (index % 50) * MINUTE_MS,
    plannedMinutes,
    finished: index < finishedCount,
  }));
}

describe('the habits Scootch learns', () => {
  it('says not enough yet with no sessions and with three', () => {
    expect(learnHabits([], HOME)).toEqual({ kind: 'not_enough_yet' });
    expect(learnHabits(sessions(3, 13, 10, 3), HOME)).toEqual({ kind: 'not_enough_yet' });
    expect(learnHabits(sessions(MIN_SESSIONS_TO_LEARN - 1, 13, 10, 6), HOME)).toEqual({
      kind: 'not_enough_yet',
    });
    expect(learnHabits(sessions(MIN_SESSIONS_TO_LEARN, 13, 10, 7), HOME).kind).toBe('learned');
  });

  it('learns from thirty: starts just after lunch, finishes ten-minute things nine times in ten', () => {
    const thirty = [
      ...sessions(14, 13, 10, 13),
      ...sessions(6, 14, 10, 5, 14),
      ...sessions(5, 13, 25, 3, 20),
      // The odd days: a 3am start, a late night, an early morning.
      ...sessions(1, 3, 25, 0, 25),
      ...sessions(2, 23, 25, 1, 26),
      ...sessions(2, 8, 50, 0, 28),
    ];
    expect(thirty).toHaveLength(30);
    expect(learnHabits(thirty, HOME)).toEqual({
      kind: 'learned',
      usualStartHour: 13,
      usualFinishedMinutes: 10,
      byLength: [
        { minutes: 10, started: 20, finished: 18, rate: 0.9 },
        { minutes: 25, started: 8, finished: 4, rate: 0.5 },
        { minutes: 50, started: 2, finished: 0, rate: 0 },
      ],
      suggestedReminderHour: 13,
      suggestedAskMinutes: 10,
    });
  });

  it('sizes the next ask at the longest length the user reliably finishes', () => {
    const reliable25 = [...sessions(6, 9, 10, 6), ...sessions(6, 9, 25, 5, 6)];
    expect(learnHabits(reliable25, HOME)).toMatchObject({ suggestedAskMinutes: 25 });

    // Fifty was finished twice out of two: too few tries to call it a habit.
    const lucky50 = [...sessions(6, 9, 10, 6), ...sessions(2, 9, 50, 2, 6)];
    expect(learnHabits(lucky50, HOME)).toMatchObject({ suggestedAskMinutes: 10 });

    // Nothing reliable: the shortest length they have ever finished.
    const shaky = [...sessions(5, 9, 10, 1), ...sessions(5, 9, 25, 2, 5)];
    expect(learnHabits(shaky, HOME)).toMatchObject({
      suggestedAskMinutes: 10,
      usualFinishedMinutes: 25,
    });
  });

  it('suggests no size when nothing has ever been finished', () => {
    expect(learnHabits(sessions(8, 9, 25, 0), HOME)).toMatchObject({
      kind: 'learned',
      usualStartHour: 9,
      usualFinishedMinutes: null,
      suggestedAskMinutes: null,
    });
  });

  it('reads the hour on the wall clock of the zone, and across midnight', () => {
    const afterLunch = sessions(8, 13, 10, 8);
    expect(usualStartHour(afterLunch, HOME)).toBe(13);
    expect(usualStartHour(afterLunch, 'Europe/London')).toBe(7);
    const lateNights = [...sessions(4, 23, 10, 4), ...sessions(5, 0, 10, 5, 4)];
    expect(usualStartHour(lateNights, HOME)).toBe(0);
    expect(usualStartHour([], HOME)).toBeNull();
  });
});

const hour = fc.integer({ min: 0, max: 23 });
const anySession: fc.Arbitrary<PastSession> = fc.record({
  startedAt: fc.integer({ min: midnight, max: midnight + 200 * DAY_MS }),
  plannedMinutes: fc.constantFrom(2, 5, 10, 25, 50),
  finished: fc.boolean(),
});

describe('habit properties', { timeout: 60_000 }, () => {
  it('never offers a number from too little history', () => {
    fc.assert(
      fc.property(fc.array(anySession, { maxLength: MIN_SESSIONS_TO_LEARN - 1 }), (few) => {
        expect(learnHabits(few, HOME)).toStrictEqual({ kind: 'not_enough_yet' });
      }),
    );
  });

  it('keeps the usual hour when fewer odd days than usual ones are added, at any hours', () => {
    fc.assert(
      fc.property(
        hour,
        fc.integer({ min: MIN_SESSIONS_TO_LEARN, max: 40 }),
        fc.array(hour, { maxLength: 39 }),
        (usual, count, oddHours) => {
          const odd = oddHours
            .slice(0, count - 1)
            .flatMap((at, index) => sessions(1, at, 10, 1, 50 + index));
          const habits = learnHabits([...sessions(count, usual, 10, count), ...odd], HOME);
          expect(habits).toMatchObject({ usualStartHour: usual, suggestedReminderHour: usual });
        },
      ),
    );
  });

  it('counts every session once and only suggests a size the user has really finished', () => {
    fc.assert(
      fc.property(
        fc.array(anySession, { minLength: MIN_SESSIONS_TO_LEARN, maxLength: 80 }),
        (all) => {
          const habits = learnHabits(all, HOME);
          if (habits.kind !== 'learned') throw new Error('expected habits from this much history');
          expect(habits.byLength.reduce((sum, one) => sum + one.started, 0)).toBe(all.length);
          expect(habits.byLength).toStrictEqual(completionByLength(all));
          for (const one of habits.byLength) {
            expect(one.rate).toBeGreaterThanOrEqual(0);
            expect(one.rate).toBeLessThanOrEqual(1);
          }
          const finishedLengths = habits.byLength.filter((one) => one.finished > 0);
          if (finishedLengths.length === 0) {
            expect(habits.suggestedAskMinutes).toBeNull();
            expect(habits.usualFinishedMinutes).toBeNull();
          } else {
            const minutes = finishedLengths.map((one) => one.minutes);
            expect(minutes).toContain(habits.suggestedAskMinutes);
            expect(minutes).toContain(habits.usualFinishedMinutes);
          }
        },
      ),
    );
  });
});
