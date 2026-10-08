import { describe, expect, it } from '@jest/globals';

import { defaultSettings } from '../data/repositories/settings';
import { askOf, DEFAULT_ACTION } from '../features/surfaces/notification-responses';
import { JOKES, PLAIN, seriousTask, taskRow } from '../features/surfaces/test/rows';

import { dayNotifications, type DayNotificationsInput } from './day-notifications';

const MOLAR = { name: 'Molar', image: 'surface-monster-00c0ffee.png' };

function planned(changes: Partial<DayNotificationsInput> = {}) {
  return dayNotifications({
    today: { kind: 'task_set', task: taskRow(), startsLeft: 1 },
    settings: { ...defaultSettings('en'), firstLaunchDoneAt: '2026-10-01T09:00:00.000Z' },
    localDate: '2026-10-06',
    timeZone: 'Europe/London',
    usualStart: '10:00',
    monster: MOLAR,
    ...changes,
  });
}

const todays = (list: ReturnType<typeof planned>) => list.filter((one) => one.taskId === 'task-1');

describe('who sends a notification', () => {
  it("sends today's lines in the monster's name, with the bites and actions under them", () => {
    for (const attitude of ['soft', 'cheeky', 'unhinged'] as const) {
      const settings = {
        ...defaultSettings('en'),
        attitude,
        firstLaunchDoneAt: '2026-10-01T09:00:00.000Z',
      };
      const own = todays(planned({ settings }));
      expect(own.length).toBeGreaterThan(0);
      for (const one of own) {
        expect(one).toMatchObject({ from: MOLAR, actions: true });
        expect(taskRow().notifications.map((line) => line.text)).toContain(one.text);
      }
    }
  });

  it("is Scootch's own, with nothing under it, before the monster has hatched", () => {
    const own = todays(planned({ monster: null }));
    expect(own.length).toBeGreaterThan(0);
    for (const one of own) {
      expect(one.from).toBeUndefined();
      expect(one.actions).toBeUndefined();
    }
  });

  it('sends the days ahead as Scootch, from the offline pack, about no thing', () => {
    const ahead = planned().filter((one) => one.taskId === undefined);
    expect(ahead.length).toBeGreaterThan(0);
    for (const one of ahead) {
      expect(one.from).toBeUndefined();
      expect(one.text).not.toContain('dentist');
    }
  });

  it('sends a serious task nothing but the plain reminder it asked for, from Scootch', () => {
    const today = { kind: 'serious', task: seriousTask(), session: null } as const;
    expect(planned({ today })).toEqual([]);
    const asked = planned({ today, reminderAt: Date.parse('2026-10-06T15:00:00.000Z') });
    expect(asked).toHaveLength(1);
    expect(asked[0]?.from).toBeUndefined();
    expect(asked[0]?.actions).toBeUndefined();
    expect(asked[0]?.text).not.toContain('hospital');
    expect(Object.values(JOKES).flat()).not.toContain(asked[0]?.text);
    expect(Object.values(PLAIN).flat()).not.toContain('Molar');
  });

  it('sends nothing at all on a crisis day', () => {
    expect(planned({ today: { kind: 'crisis' } })).toEqual([]);
  });

  it('sends a monster turned down for a week the soft lines, no more often than Soft does', () => {
    const settings = {
      ...defaultSettings('en'),
      attitude: 'unhinged' as const,
      firstLaunchDoneAt: '2026-10-01T09:00:00.000Z',
    };
    const task = taskRow({ softUntil: '2026-10-12' });
    const loud = todays(planned({ settings }));
    const quiet = todays(planned({ settings, today: { kind: 'task_set', task, startsLeft: 1 } }));
    const soft = todays(planned({ settings: { ...settings, attitude: 'soft' } }));
    expect(quiet).toHaveLength(soft.length);
    expect(quiet.length).toBeLessThanOrEqual(loud.length);
    for (const one of quiet) {
      expect(one.from).toEqual(MOLAR);
      expect(taskRow().notifications.map((line) => line.text)).not.toContain(one.text);
    }
    // The week is over the day after.
    const after = { ...task, softUntil: '2026-10-05' };
    const again = todays(
      planned({ settings, today: { kind: 'task_set', task: after, startsLeft: 1 } }),
    );
    expect(again.map((one) => one.text)).toEqual(loud.map((one) => one.text));
  });
});

describe('what a tap on a notification asks for', () => {
  const response = (actionIdentifier: string, data: unknown) => ({
    actionIdentifier,
    notification: { request: { content: { data } } },
  });

  it('hunts the thing a monster wrote about, on a tap and on the first action', () => {
    expect(askOf(response(DEFAULT_ACTION, { taskId: 't' }))).toEqual({ kind: 'hunt', taskId: 't' });
    expect(askOf(response('scootch.hunt.now', { body: { taskId: 't' } }))).toEqual({
      kind: 'hunt',
      taskId: 't',
    });
  });

  it("only opens the app for Scootch's own", () => {
    expect(askOf(response(DEFAULT_ACTION, {}))).toBeNull();
    expect(askOf(response(DEFAULT_ACTION, null))).toBeNull();
  });

  it('needs the thing for tomorrow at nine and for turning it down', () => {
    expect(askOf(response('scootch.hunt.tomorrow', { taskId: 't' }))).toEqual({
      kind: 'tomorrow',
      taskId: 't',
    });
    expect(askOf(response('scootch.hunt.turn-down', { taskId: 't' }))).toEqual({
      kind: 'turn_down',
      taskId: 't',
    });
    expect(askOf(response('scootch.hunt.tomorrow', {}))).toBeNull();
    expect(askOf(response('something.else', { taskId: 't' }))).toBeNull();
  });
});
