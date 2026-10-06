import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { IsoDate } from '../contracts';

import {
  HOUR_MS,
  addDays,
  daysBetween,
  instantFromIso,
  instantOfLocal,
  isoFromInstant,
  localDateTime,
} from './local-time';
import { currentScootchDay, scootchDayOf, scootchDayStart } from './scootch-day';

const at = (iso: string) => instantFromIso(iso);

describe('the Scootch day an instant belongs to', () => {
  it.each([
    // Ho Chi Minh City is UTC+7 all year: the day turns at 04:00 there, which is 21:00 UTC.
    ['Asia/Ho_Chi_Minh', '2026-10-06T20:59:00Z', '2026-10-06'],
    ['Asia/Ho_Chi_Minh', '2026-10-06T21:00:00Z', '2026-10-07'],
    // Midnight UTC and local midnight are not rollovers.
    ['Asia/Ho_Chi_Minh', '2026-10-06T23:59:00Z', '2026-10-07'],
    ['Asia/Ho_Chi_Minh', '2026-10-07T00:01:00Z', '2026-10-07'],
    ['Asia/Ho_Chi_Minh', '2026-10-06T17:30:00Z', '2026-10-06'],
    ['Europe/London', '2026-10-07T02:59:00Z', '2026-10-06'],
    ['Europe/London', '2026-10-07T03:00:00Z', '2026-10-07'],
    // New York springs forward on 8 March 2026: 02:00 EST becomes 03:00 EDT.
    ['America/New_York', '2026-03-07T08:59:00Z', '2026-03-06'],
    ['America/New_York', '2026-03-07T09:00:00Z', '2026-03-07'],
    ['America/New_York', '2026-03-08T06:59:00Z', '2026-03-07'],
    ['America/New_York', '2026-03-08T07:59:00Z', '2026-03-07'],
    ['America/New_York', '2026-03-08T08:00:00Z', '2026-03-08'],
    // New York falls back on 1 November 2026: 01:30 happens twice, both in the day before.
    ['America/New_York', '2026-11-01T05:30:00Z', '2026-10-31'],
    ['America/New_York', '2026-11-01T06:30:00Z', '2026-10-31'],
    ['America/New_York', '2026-11-01T08:59:00Z', '2026-10-31'],
    ['America/New_York', '2026-11-01T09:00:00Z', '2026-11-01'],
    // London falls back on 25 October 2026.
    ['Europe/London', '2026-10-25T03:59:00Z', '2026-10-24'],
    ['Europe/London', '2026-10-25T04:00:00Z', '2026-10-25'],
  ])('in %s at %s it is %s', (timeZone, instant, day) => {
    expect(scootchDayOf(at(instant), timeZone)).toBe(day);
  });

  it.each([
    ['America/New_York', '2026-03-07', 23],
    ['America/New_York', '2026-03-08', 24],
    ['America/New_York', '2026-10-31', 25],
    ['Europe/London', '2026-03-28', 23],
    ['Europe/London', '2026-10-24', 25],
    ['Asia/Ho_Chi_Minh', '2026-10-24', 24],
  ])('in %s the day %s lasts %i hours', (timeZone, day, hours) => {
    const length = scootchDayStart(addDays(day, 1), timeZone) - scootchDayStart(day, timeZone);
    expect(length / HOUR_MS).toBe(hours);
  });

  it('starts each day at 04:00 on the local clock', () => {
    expect(isoFromInstant(scootchDayStart('2026-03-08', 'America/New_York'))).toBe(
      '2026-03-08T08:00:00.000Z',
    );
    expect(isoFromInstant(scootchDayStart('2026-10-07', 'Asia/Ho_Chi_Minh'))).toBe(
      '2026-10-06T21:00:00.000Z',
    );
  });

  it('resolves a wall-clock time the clocks skip to the same distance past the jump', () => {
    const instant = instantOfLocal('2026-03-08', '02:30', 'America/New_York');
    expect(localDateTime(instant, 'America/New_York')).toEqual({
      date: '2026-03-08',
      hour: 3,
      minute: 30,
    });
  });
});

describe('a user who changes time zone', () => {
  it.each<[string, string, string, IsoDate | null, IsoDate]>([
    // Morning in Ho Chi Minh City, day already opened there.
    ['at home', '2026-10-07T01:00:00Z', 'Asia/Ho_Chi_Minh', null, '2026-10-07'],
    // Landed in Los Angeles where it is still the evening of the 6th: the opened day carries on.
    ['flew west', '2026-10-07T03:00:00Z', 'America/Los_Angeles', '2026-10-07', '2026-10-07'],
    // It stays that day until Los Angeles reaches its own next morning.
    ['still west', '2026-10-08T10:59:00Z', 'America/Los_Angeles', '2026-10-07', '2026-10-07'],
    [
      'next morning west',
      '2026-10-08T11:00:00Z',
      'America/Los_Angeles',
      '2026-10-07',
      '2026-10-08',
    ],
    // Flying east starts the next day early: noon in Los Angeles is past 04:00 in Ho Chi Minh City.
    ['flew east', '2026-10-06T21:00:00Z', 'Asia/Ho_Chi_Minh', '2026-10-06', '2026-10-07'],
    ['east, small hours', '2026-10-06T19:00:00Z', 'Asia/Ho_Chi_Minh', '2026-10-06', '2026-10-06'],
  ])('%s: %s in %s is %s', (_name, instant, timeZone, latestDay, day) => {
    expect(currentScootchDay({ now: at(instant), timeZone, latestDay })).toBe(day);
  });
});

const zones = [
  'Asia/Ho_Chi_Minh',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Lord_Howe',
  'Asia/Kathmandu',
  'Pacific/Auckland',
  'America/Sao_Paulo',
];
const zone = fc.constantFrom(...zones);
const instant = fc.integer({ min: at('2026-01-01T00:00:00Z'), max: at('2028-12-31T00:00:00Z') });

describe('day rollover properties', { timeout: 60_000 }, () => {
  it('never moves a later instant to an earlier day, and at most one day per 23 hours', () => {
    fc.assert(
      fc.property(
        zone,
        instant,
        fc.integer({ min: 0, max: 23 * HOUR_MS }),
        (timeZone, now, gap) => {
          const before = scootchDayOf(now, timeZone);
          const after = scootchDayOf(now + gap, timeZone);
          expect(after >= before).toBe(true);
          expect(daysBetween(before, after)).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it('follows the local clock, not UTC: in a fixed UTC+7 zone the day is the date four hours ago', () => {
    fc.assert(
      fc.property(instant, (now) => {
        const expected = new Date(now + 7 * HOUR_MS - 4 * HOUR_MS).toISOString().slice(0, 10);
        expect(scootchDayOf(now, 'Asia/Ho_Chi_Minh')).toBe(expected);
      }),
    );
  });

  it('puts every instant inside the day it names', () => {
    fc.assert(
      fc.property(zone, instant, (timeZone, now) => {
        const day = scootchDayOf(now, timeZone);
        expect(scootchDayStart(day, timeZone)).toBeLessThanOrEqual(now);
        expect(scootchDayStart(addDays(day, 1), timeZone)).toBeGreaterThan(now);
      }),
    );
  });

  it('never reopens an earlier day, whatever zones the user passes through', () => {
    const hop = fc.record({ timeZone: zone, wait: fc.integer({ min: 0, max: 30 * HOUR_MS }) });
    fc.assert(
      fc.property(instant, fc.array(hop, { maxLength: 20 }), (start, hops) => {
        let now = start;
        let latestDay: IsoDate | null = null;
        for (const { timeZone, wait } of hops) {
          now += wait;
          const day = currentScootchDay({ now, timeZone, latestDay });
          if (latestDay !== null) expect(day >= latestDay).toBe(true);
          expect(day >= scootchDayOf(now, timeZone)).toBe(true);
          latestDay = day;
        }
      }),
    );
  });
});
