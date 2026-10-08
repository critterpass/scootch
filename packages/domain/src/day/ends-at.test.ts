import { describe, expect, it } from 'vitest';

import { DEFAULT_DAY_MOMENT_TIMES, type StartCue } from '../contracts';

import {
  backAround,
  clockAt,
  cueClock,
  endTime,
  getReadyTime,
  heardGap,
  instantOnScootchDay,
  longestLengthWithin,
} from './ends-at';
import { MINUTE_MS, instantFromIso } from './local-time';
import { scootchDayOf } from './scootch-day';
import { TODAY } from './test/rows';

const LONDON = 'Europe/London';
/** The lengths on the wheel. */
const WHEEL = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 120, 150, 180];
/** An instant on the London wall clock; `days` after `TODAY`, which is in summer time. */
const london = (clock: string, days = 0) =>
  instantFromIso(`2026-10-0${6 + days}T${clock}:00+01:00`);

describe('the end time of a length', () => {
  it('is the length after now, on the wall clock of the zone the user is in', () => {
    const now = london('15:17');
    expect(endTime(now, 25, LONDON)).toEqual({ at: now + 25 * MINUTE_MS, clock: '15:42' });
    expect(endTime(now, 25, 'Asia/Ho_Chi_Minh').clock).toBe('21:42');
    expect(endTime(now, 180, 'America/New_York').clock).toBe('13:17');
  });

  it('runs across midnight and across the hour the day rolls over at', () => {
    expect(endTime(london('23:50'), 25, LONDON).clock).toBe('00:15');
    expect(endTime(london('22:30'), 180, LONDON).clock).toBe('01:30');
    // 03:50 belongs to the Scootch day before; a length started then ends in the next one.
    const beforeRollover = london('03:50', 1);
    const end = endTime(beforeRollover, 25, LONDON);
    expect(end.clock).toBe('04:15');
    expect(scootchDayOf(beforeRollover, LONDON)).toBe(TODAY);
    expect(scootchDayOf(end.at, LONDON)).toBe('2026-10-07');
  });

  it('follows the clock when it changes: an hour that happens twice is still one length', () => {
    // 25 October 2026, 01:50 summer time; the clocks go back at 02:00.
    const now = instantFromIso('2026-10-25T01:50:00+01:00');
    expect(endTime(now, 25, LONDON)).toEqual({ at: now + 25 * MINUTE_MS, clock: '01:15' });
  });
});

describe('when a thing with a cue is brought back', () => {
  const moments = DEFAULT_DAY_MOMENT_TIMES;
  const lunch: StartCue = { kind: 'moment', moment: 'lunch' };
  const back = (cue: StartCue, now: number, over = moments) =>
    backAround({ cue, moments: over, localDate: TODAY, timeZone: LONDON, now });

  it('is the clock time of its day moment, from the settings', () => {
    expect(back(lunch, london('09:41'))).toEqual({
      at: london('13:10'),
      clock: '13:10',
      ahead: true,
    });
    // The user moved lunch: the same cue follows it.
    expect(back(lunch, london('09:41'), { ...moments, lunch: '12:15' }).clock).toBe('12:15');
    expect(cueClock({ kind: 'moment', moment: 'bed' }, moments)).toBe(moments.bed);
  });

  it('is its own clock time when the user picked one', () => {
    expect(back({ kind: 'time', at: '16:45' }, london('09:41'))).toEqual({
      at: london('16:45'),
      clock: '16:45',
      ahead: true,
    });
  });

  it('is not ahead once its time has gone by', () => {
    expect(back(lunch, london('13:10')).ahead).toBe(false);
    expect(back(lunch, london('18:00')).ahead).toBe(false);
  });

  it('keeps the small hours with the day they end, and stops at the rollover', () => {
    // 01:30 on Tuesday's Scootch day is Wednesday on the calendar.
    const late: StartCue = { kind: 'time', at: '01:30' };
    expect(back(late, london('23:00'))).toEqual({
      at: london('01:30', 1),
      clock: '01:30',
      ahead: true,
    });
    expect(instantOnScootchDay(TODAY, '03:59', LONDON)).toBe(london('03:59', 1));
    // 04:00 is where Tuesday began: at three the next morning it is long gone, not an hour away.
    expect(instantOnScootchDay(TODAY, '04:00', LONDON)).toBe(london('04:00'));
    expect(back({ kind: 'time', at: '04:00' }, london('03:00', 1)).ahead).toBe(false);
  });
});

describe('the time before a heard time', () => {
  const dentist = { at: '15:00', heardAs: 'dentist at 3', watched: true };
  const gap = (now: number, heardTime = dentist, leadMinutes = 35, lengths = WHEEL) =>
    heardGap({ heardTime, leadMinutes, localDate: TODAY, timeZone: LONDON, now, lengths });

  it('gets ready the lead before it: 35 minutes before three is 2:25', () => {
    const input = { heardTime: dentist, localDate: TODAY, timeZone: LONDON, now: london('11:00') };
    expect(getReadyTime({ ...input, leadMinutes: 35 })).toEqual({
      at: london('14:25'),
      clock: '14:25',
    });
    expect(getReadyTime({ ...input, leadMinutes: 60 })?.clock).toBe('14:00');
  });

  it('offers the longest length that ends by the get-ready time', () => {
    // At 11:00 there are 205 minutes: the whole wheel fits.
    expect(gap(london('11:00'))).toEqual({
      getReady: { at: london('14:25'), clock: '14:25' },
      gapMinutes: 205,
      longestMinutes: 180,
      fits: true,
    });
    // 45 minutes: 40 ends at 2:20, and 50 would run past.
    expect(gap(london('13:40'))).toMatchObject({ gapMinutes: 45, longestMinutes: 40 });
    // A length that ends on the minute still ends in time.
    expect(gap(london('13:45'))).toMatchObject({ gapMinutes: 40, longestMinutes: 40 });
    expect(gap(london('14:17'))).toMatchObject({ gapMinutes: 8, longestMinutes: 5, fits: true });
  });

  it('counts only whole minutes that are really left', () => {
    // Thirty seconds past 13:45: forty minutes from now would end after 2:25.
    expect(gap(london('13:45') + 30_000)).toMatchObject({ gapMinutes: 39, longestMinutes: 30 });
  });

  it('offers no length into a gap under five minutes', () => {
    expect(gap(london('14:21'))).toMatchObject({
      gapMinutes: 4,
      longestMinutes: null,
      fits: false,
    });
    // The get-ready time has come and the dentist has not: still watched, nothing fits.
    expect(gap(london('14:40'))).toMatchObject({
      gapMinutes: 0,
      longestMinutes: null,
      fits: false,
    });
    // A bargained length shorter than five minutes is never slipped into a gap either.
    expect(longestLengthWithin([3, ...WHEEL], 4)).toBeNull();
    expect(longestLengthWithin([], 60)).toBeNull();
  });

  it('ignores a heard time that has already gone by', () => {
    expect(gap(london('15:00'))).toBeNull();
    expect(gap(london('18:30'))).toBeNull();
  });

  it('plans nothing around a time the user said not to watch', () => {
    expect(gap(london('11:00'), { ...dentist, watched: false })).toBeNull();
  });

  it('reaches across midnight to a time in the small hours', () => {
    const train = { at: '00:30', heardAs: 'train at half twelve', watched: true };
    expect(gap(london('23:00'), train)).toEqual({
      getReady: { at: london('23:55'), clock: '23:55' },
      gapMinutes: 55,
      longestMinutes: 50,
      fits: true,
    });
    // After midnight it is still the same Scootch day, and a time in its small hours is ahead.
    const car = { at: '01:30', heardAs: 'car at half one', watched: true };
    expect(gap(london('00:10', 1), car)).toMatchObject({ gapMinutes: 45, longestMinutes: 40 });
  });

  it('does not reach across the rollover: a time after it is not on this day', () => {
    // At three in the morning, 04:30 on this Scootch day was yesterday morning.
    const flight = { at: '04:30', heardAs: 'flight at half four', watched: true };
    expect(gap(london('03:00', 1), flight)).toBeNull();
  });

  it('shows every time on the wall clock of the zone', () => {
    expect(clockAt(london('14:25'), 'Asia/Ho_Chi_Minh')).toBe('20:25');
  });
});
