import { describe, expect, it } from '@jest/globals';

import {
  instantOfLocal,
  localDateTime,
  type DayHeardTime,
  type IsoDate,
  type SettingsRow,
  type TodayState,
} from '@scootch/domain';
import { getReadyLine } from '@scootch/voice';

import { defaultSettings } from '../data/repositories/settings';
import { seriousTask, taskRow } from '../features/surfaces/test/rows';

import { dayNotifications } from './day-notifications';
import { heardTimeToKeep, openingLength } from './heard-time';

/** The lengths on the wheel. */
const SESSION_MINUTES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 120, 150, 180];
const TODAY: IsoDate = '2026-10-06';
const ZONE = 'Europe/London';
const LAUNCHED = '2026-10-01T09:00:00.000Z';
const at = (clock: string) => instantOfLocal(TODAY, clock, ZONE);
const DENTIST: DayHeardTime = { at: '15:00', heardAs: 'dentist at 3', watched: true };
const NUDGE = getReadyLine('en', 'dentist at 3');

function settings(changes: Partial<SettingsRow> = {}): SettingsRow {
  return { ...defaultSettings('en'), firstLaunchDoneAt: LAUNCHED, ...changes };
}

/** The wheel's opening length at `now`, with the dentist at 15:00 and the usual 35-minute lead. */
function opensAt(now: string, heardTime: DayHeardTime | null = DENTIST) {
  return openingLength(
    { heardTime, settings: settings(), localDate: TODAY, timeZone: ZONE, now: at(now) },
    { usual: 10, smallest: null, lengths: SESSION_MINUTES },
  );
}

describe('the wheel before a heard time', () => {
  it('opens at the longest length that ends before getting ready', () => {
    // Getting ready starts at 14:25.
    expect(opensAt('14:17')).toEqual({ minutes: 5, beforeGetReady: true });
    expect(opensAt('13:40')).toEqual({ minutes: 40, beforeGetReady: true });
    expect(opensAt('10:25')).toEqual({ minutes: 180, beforeGetReady: true });
  });

  it('opens as on any day when under five minutes are left, or the time has gone by', () => {
    expect(opensAt('14:22')).toEqual({ minutes: 10, beforeGetReady: false });
    expect(opensAt('15:30')).toEqual({ minutes: 10, beforeGetReady: false });
  });

  it('has no cap at all once the person said "Don\'t watch it"', () => {
    expect(opensAt('13:40', { ...DENTIST, watched: false })).toEqual({
      minutes: 10,
      beforeGetReady: false,
    });
  });
});

describe('keeping a heard time', () => {
  const heard = { at: DENTIST.at, heardAs: DENTIST.heardAs };
  const input = (now: string) => ({ localDate: TODAY, timeZone: ZONE, now: at(now) });

  it('keeps a time still ahead today, watched', () => {
    expect(heardTimeToKeep(heard, input('09:00'))).toEqual(DENTIST);
  });

  it('ignores a time that has already gone by', () => {
    expect(heardTimeToKeep(heard, input('15:10'))).toBeNull();
    expect(heardTimeToKeep(null, input('09:00'))).toBeNull();
  });
});

function planned(
  today: TodayState,
  heardTime: DayHeardTime | null,
  changes: Partial<SettingsRow> = {},
  now = '09:00',
) {
  return dayNotifications({
    today,
    settings: settings(changes),
    localDate: TODAY,
    timeZone: ZONE,
    usualStart: '10:00',
    now: at(now),
    heardTime,
  });
}

/** Today's planned texts with their local clock times. */
function todays(plan: ReturnType<typeof planned>) {
  return plan
    .map((one) => ({ ...one, local: localDateTime(one.at, ZONE) }))
    .filter((one) => one.local.date === TODAY)
    .map((one) => ({
      text: one.text,
      clock: `${String(one.local.hour).padStart(2, '0')}:${String(one.local.minute).padStart(2, '0')}`,
      from: one.from,
    }));
}

describe('the nudge to get ready', () => {
  const SET: TodayState = { kind: 'task_set', task: taskRow(), startsLeft: 1 };

  it('is planned exactly once, from Scootch, at the get-ready time', () => {
    const nudges = todays(planned(SET, DENTIST, { attitude: 'cheeky' })).filter(
      (one) => one.text === NUDGE,
    );
    expect(nudges).toEqual([{ text: NUDGE, clock: '14:25', from: undefined }]);
  });

  it('takes the one place a Soft day has: one message in all', () => {
    expect(todays(planned(SET, DENTIST, { attitude: 'soft' }))).toEqual([
      { text: NUDGE, clock: '14:25', from: undefined },
    ]);
  });

  it('is sent on a day with nothing set too, and on a serious day in place of the cue', () => {
    const nothingSet: TodayState = { kind: 'nothing_yet', startsLeft: 1 };
    expect(todays(planned(nothingSet, DENTIST))).toEqual([
      { text: NUDGE, clock: '14:25', from: undefined },
    ]);
    const serious: TodayState = {
      kind: 'serious',
      task: { ...seriousTask(), startCue: { kind: 'time', at: '16:00' } },
      session: null,
    };
    expect(todays(planned(serious, DENTIST)).map((one) => one.text)).toEqual([NUDGE]);
  });

  it('is not planned once the person said "Don\'t watch it"', () => {
    const plan = todays(planned(SET, { ...DENTIST, watched: false }));
    expect(plan.some((one) => one.text === NUDGE)).toBe(false);
  });

  it('is not planned for a time already gone by, nor inside quiet hours', () => {
    expect(todays(planned(SET, DENTIST, {}, '15:30')).some((one) => one.text === NUDGE)).toBe(
      false,
    );
    const quiet = { quietHoursStart: '14:00', quietHoursEnd: '15:00' } as const;
    expect(todays(planned(SET, DENTIST, quiet)).some((one) => one.text === NUDGE)).toBe(false);
  });
});
