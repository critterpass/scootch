import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  localDateTime,
  type Attitude,
  type IsoDate,
  type SettingsRow,
  type TodayState,
} from '@scootch/domain';
import { offlinePacks } from '@scootch/voice';

import { defaultSettings } from '../data/repositories/settings';
import { fakeRunner } from '../effects/test/fake-adapters';
import { seriousTask, sessionRow, taskRow } from '../features/surfaces/test/rows';

import { PLAN_AHEAD_DAYS, dayNotifications } from './day-notifications';

const TODAY: IsoDate = '2026-10-06';
const ZONE = 'Europe/London';
const SET: TodayState = { kind: 'task_set', task: taskRow(), startsLeft: 1 };
const OWN = taskRow().notifications.map((one) => one.text);

function plan(today: TodayState, changes: Partial<SettingsRow> = {}, usualStart = '10:00') {
  const settings = { ...defaultSettings('en'), ...changes };
  return dayNotifications({ today, settings, localDate: TODAY, timeZone: ZONE, usualStart });
}

/** The planned texts of the day `ahead` days after today, with their local clock times. */
function onDay(planned: ReturnType<typeof plan>, ahead: number) {
  const day = addDays(TODAY, ahead);
  return planned
    .map((one) => ({ ...one, local: localDateTime(one.at, ZONE) }))
    .filter((one) => one.local.date === day)
    .map((one) => ({
      text: one.text,
      clock: `${String(one.local.hour).padStart(2, '0')}:${String(one.local.minute).padStart(2, '0')}`,
    }));
}

const voiceLines = (attitude: Attitude) => offlinePacks.en.lines[attitude].notification;

describe('the notifications planned from today on', () => {
  it("sends today the task's own lines at each attitude's limit, from the usual start", () => {
    expect(onDay(plan(SET, { attitude: 'soft' }), 0)).toEqual([{ text: OWN[0], clock: '10:00' }]);
    for (const attitude of ['cheeky', 'unhinged'] as const) {
      expect(onDay(plan(SET, { attitude }), 0)).toEqual([
        { text: OWN[0], clock: '10:00' },
        { text: OWN[1], clock: '10:45' },
        { text: OWN[2], clock: '11:30' },
      ]);
    }
  });

  it('plans each later day one more day ignored: the full back-off table for Unhinged', () => {
    const planned = plan(SET, { attitude: 'unhinged' });
    const counts = Array.from(
      { length: PLAN_AHEAD_DAYS },
      (_, index) => onDay(planned, index + 1).length,
    );
    // Tomorrow is day 1 again (opened today), then 2, then 1 a day for two days, then silence
    // with one soft note a week into it.
    expect(counts).toEqual([3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
    const texts = (ahead: number) => onDay(planned, ahead).map((one) => one.text);
    for (const text of texts(1)) expect(voiceLines('unhinged')).toContain(text);
    for (const text of texts(2)) expect(voiceLines('soft')).toContain(text);
    for (const text of texts(3)) expect(voiceLines('cheeky')).toContain(text);
    for (const text of texts(12)) expect(voiceLines('soft')).toContain(text);
  });

  it('never goes above the attitude on the later days', () => {
    const cheeky = plan(SET, { attitude: 'cheeky' });
    expect([1, 2, 3, 4, 5].map((ahead) => onDay(cheeky, ahead).length)).toEqual([3, 2, 1, 1, 0]);
    const soft = plan(SET, { attitude: 'soft' });
    expect([1, 2, 3, 4, 5, 12].map((ahead) => onDay(soft, ahead).length)).toEqual([
      1, 1, 1, 1, 0, 1,
    ]);
    for (const one of soft.slice(1)) expect(voiceLines('soft')).toContain(one.text);
  });

  it('says nothing of the days before today: a first day and a return read the same', () => {
    // The plan has no input for when the app was last opened, so opening it is the reset.
    expect(plan(SET)).toEqual(plan(SET));
    expect(onDay(plan(SET, { attitude: 'unhinged' }), 0)).toHaveLength(3);
  });

  it('keeps out of quiet hours at both edges', () => {
    const quiet = { quietHoursStart: '11:30', quietHoursEnd: '08:00' } as const;
    // The start of quiet hours is quiet: 11:30 is not sent, 10:45 is.
    expect(onDay(plan(SET, quiet), 0).map((one) => one.clock)).toEqual(['10:00', '10:45']);
    // The end is not quiet: a usual start inside quiet hours waits for exactly their end.
    expect(onDay(plan(SET, quiet, '07:10'), 0).map((one) => one.clock)).toEqual([
      '08:00',
      '08:45',
      '09:30',
    ]);
    for (const one of plan(SET, { quietHoursStart: '21:00', quietHoursEnd: '08:30' }, '20:30')) {
      const { hour, minute } = localDateTime(one.at, ZONE);
      const at = hour * 60 + minute;
      expect(at >= 8 * 60 + 30 && at < 21 * 60).toBe(true);
    }
  });

  it('plans nothing at all on a crisis day', () => {
    for (const attitude of ['soft', 'cheeky', 'unhinged'] as const) {
      expect(plan({ kind: 'crisis' }, { attitude })).toEqual([]);
    }
  });

  it('never plans an Unhinged or Cheeky line while a serious task is open', () => {
    for (const session of [null, sessionRow()]) {
      const planned = plan(
        { kind: 'serious', task: seriousTask(), session },
        { attitude: 'unhinged' },
      );
      expect(onDay(planned, 0)).toEqual([]);
      expect(planned.length).toBeGreaterThan(0);
      for (const one of planned) {
        expect(voiceLines('soft')).toContain(one.text);
        expect(OWN).not.toContain(one.text);
      }
      expect([1, 2, 3].map((ahead) => onDay(planned, ahead).length)).toEqual([1, 1, 1]);
    }
  });

  it('stays in the soft voice while the task has not been screened', () => {
    const unscreened = taskRow({ screen: 'unscreened', lines: null, notifications: [] });
    const planned = plan(
      { kind: 'task_set', task: unscreened, startsLeft: 1 },
      { attitude: 'unhinged' },
    );
    expect(onDay(planned, 0)).toEqual([]);
    for (const one of planned) expect(voiceLines('soft')).toContain(one.text);
  });

  it("sends none of today's lines once the task is started or the day is done", () => {
    const started = taskRow({ status: 'started' });
    expect(onDay(plan({ kind: 'in_session', task: started, session: sessionRow() }), 0)).toEqual(
      [],
    );
    expect(onDay(plan({ kind: 'done_for_today', startsLeft: 0 }), 0)).toEqual([]);
  });

  it('cancels what was scheduled when the day turns to crisis', async () => {
    const { runner, device } = fakeRunner(Date.parse('2026-10-06T06:00:00.000Z'));
    await runner.syncNotifications(plan(SET, { attitude: 'unhinged' }));
    expect(device.scheduled().length).toBeGreaterThan(3);
    expect(
      device
        .scheduled()
        .slice(0, 3)
        .map((one) => one.text),
    ).toEqual(OWN);
    await runner.syncNotifications(plan({ kind: 'crisis' }, { attitude: 'unhinged' }));
    expect(device.scheduled()).toEqual([]);
  });
});
