import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addDays } from './local-time';
import { LONG_AWAY_DAYS, morningOffer } from './morning';
import {
  TODAY,
  dayRow,
  drawerItem,
  sessionRow,
  sessionRowArbitrary,
  taskRow,
  taskRowArbitrary,
} from './test/rows';
import { startsAllowed, startsLeft, todayState } from './today-state';

const base = { localDate: TODAY, day: dayRow(), tasks: [], sessions: [], plus: false };

describe('how many things may be started today', () => {
  it('is one when free and three with Plus', () => {
    expect(startsAllowed(false)).toBe(1);
    expect(startsAllowed(true)).toBe(3);
  });

  it.each([
    [false, [], 1],
    [false, ['set'], 1],
    [false, ['started'], 0],
    [false, ['finished'], 0],
    [true, ['finished'], 2],
    [true, ['finished', 'finished', 'started'], 0],
    [true, ['finished', 'finished', 'finished', 'finished'], 0],
  ] as const)('plus %s with tasks %j leaves %i', (plus, statuses, left) => {
    const tasks = statuses.map((status, index) => taskRow({ id: `task-${index}x`, status }));
    expect(startsLeft({ localDate: TODAY, tasks, plus })).toBe(left);
  });

  it('does not count another day, and a task that was let go has no row to count', () => {
    const tasks = [taskRow({ localDate: addDays(TODAY, -1), status: 'finished' })];
    expect(startsLeft({ localDate: TODAY, tasks, plus: false })).toBe(1);
  });
});

describe("today's state", () => {
  it('is nothing yet before a task is set, also before the day has a row', () => {
    expect(todayState(base)).toEqual({ kind: 'nothing_yet', startsLeft: 1 });
    expect(todayState({ ...base, day: null })).toEqual({ kind: 'nothing_yet', startsLeft: 1 });
  });

  it('is task set, then in session while a session row is open', () => {
    const task = taskRow();
    expect(todayState({ ...base, tasks: [task] })).toEqual({
      kind: 'task_set',
      task,
      startsLeft: 1,
    });
    const started = taskRow({ status: 'started' });
    const session = sessionRow();
    expect(todayState({ ...base, tasks: [started], sessions: [session] })).toEqual({
      kind: 'in_session',
      task: started,
      session,
    });
  });

  it('goes back to task set after a session was left early', () => {
    const task = taskRow({ status: 'started' });
    const session = sessionRow({ endedAt: '2026-10-06T09:50:00+01:00', outcome: 'left_early' });
    expect(todayState({ ...base, tasks: [task], sessions: [session] }).kind).toBe('task_set');
  });

  it('is serious for a serious task, set or in session, unless the user asked for the comedy', () => {
    const task = taskRow({ screen: 'serious', status: 'started' });
    const session = sessionRow();
    expect(todayState({ ...base, tasks: [task] })).toEqual({
      kind: 'serious',
      task,
      session: null,
    });
    expect(todayState({ ...base, tasks: [task], sessions: [session] })).toEqual({
      kind: 'serious',
      task,
      session,
    });
    const overridden = taskRow({ screen: 'serious', seriousOverridden: true });
    expect(todayState({ ...base, tasks: [overridden] }).kind).toBe('task_set');
  });

  it('is done for today once the thing is finished or the day is marked done', () => {
    const finished = taskRow({ status: 'finished' });
    expect(todayState({ ...base, tasks: [finished] })).toEqual({
      kind: 'done_for_today',
      startsLeft: 0,
    });
    expect(todayState({ ...base, tasks: [finished], plus: true })).toEqual({
      kind: 'done_for_today',
      startsLeft: 2,
    });
    expect(todayState({ ...base, day: dayRow({ status: 'done' }) }).kind).toBe('done_for_today');
  });

  it('shows the next thing a Plus user sets after finishing one', () => {
    const tasks = [
      taskRow({ status: 'finished' }),
      taskRow({ id: 'task-b', createdAt: '2026-10-06T11:00:00+01:00' }),
    ];
    const state = todayState({ ...base, day: dayRow({ status: 'done' }), tasks, plus: true });
    expect(state).toEqual({ kind: 'task_set', task: tasks[1], startsLeft: 2 });
  });

  it('ignores tasks that belong to another day', () => {
    const tasks = [taskRow({ localDate: addDays(TODAY, -1) })];
    expect(todayState({ ...base, tasks }).kind).toBe('nothing_yet');
  });
});

describe('crisis', { timeout: 60_000 }, () => {
  it('beats every other state and carries no task, session or count', () => {
    fc.assert(
      fc.property(
        fc.array(taskRowArbitrary, { maxLength: 5 }),
        fc.array(sessionRowArbitrary, { maxLength: 3 }),
        fc.boolean(),
        (tasks, sessions, plus) => {
          const state = todayState({
            localDate: TODAY,
            day: dayRow({ status: 'crisis' }),
            tasks,
            sessions,
            plus,
          });
          expect(state).toStrictEqual({ kind: 'crisis' });
        },
      ),
    );
  });

  it('is the only way to hide a task that is set for today', () => {
    fc.assert(
      fc.property(
        fc.array(taskRowArbitrary, { minLength: 1, maxLength: 5 }),
        fc.constantFrom('open', 'done'),
        (tasks, status) => {
          const state = todayState({ ...base, day: dayRow({ status }), tasks });
          const open = tasks.some((task) => task.localDate === TODAY && task.status !== 'finished');
          expect('task' in state).toBe(open);
        },
      ),
    );
  });
});

describe('what the morning offers', () => {
  const yesterday = addDays(TODAY, -1);
  const carried = taskRow({ carriedOver: true });

  it('asks afresh when nothing was left over', () => {
    expect(
      morningOffer({ today: TODAY, lastOpenedDay: yesterday, tasks: [], returning: null }),
    ).toEqual({
      kind: 'fresh_ask',
    });
    expect(morningOffer({ today: TODAY, lastOpenedDay: null, tasks: [], returning: null })).toEqual(
      {
        kind: 'fresh_ask',
      },
    );
  });

  it("offers yesterday's carried-over task, smaller", () => {
    expect(
      morningOffer({ today: TODAY, lastOpenedDay: yesterday, tasks: [carried], returning: null }),
    ).toEqual({ kind: 'carried_over', taskId: 'task-a', makeSmaller: true });
  });

  it('puts a dated thing due back this morning before the carried-over task', () => {
    const returning = drawerItem({ id: 'item-tax', dueDate: addDays(TODAY, 1), returnOn: TODAY });
    expect(
      morningOffer({ today: TODAY, lastOpenedDay: yesterday, tasks: [carried], returning }),
    ).toEqual({ kind: 'deadline_returns', drawerItemId: 'item-tax' });
  });

  it.each([
    [6, 'carried_over'],
    [7, 'smallest_ask'],
    [30, 'smallest_ask'],
  ])('after %i days away the offer is %s', (days, kind) => {
    const offer = morningOffer({
      today: TODAY,
      lastOpenedDay: addDays(TODAY, -days),
      tasks: [carried],
      returning: null,
    });
    expect(offer.kind).toBe(kind);
  });
});

describe('time away in the morning offer', { timeout: 60_000 }, () => {
  const tasks = fc.array(taskRowArbitrary, { maxLength: 3 });
  const returning = fc.option(fc.constant(drawerItem({ dueDate: TODAY, returnOn: TODAY })));

  it('is the same smallest ask after a week, a month or ten years, whatever else is waiting', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: LONG_AWAY_DAYS, max: 3650 }),
        tasks,
        returning,
        (days, rows, item) => {
          const offer = morningOffer({
            today: TODAY,
            lastOpenedDay: addDays(TODAY, -days),
            tasks: rows,
            returning: item,
          });
          expect(offer).toStrictEqual({ kind: 'smallest_ask', minutes: 2 });
        },
      ),
    );
  });

  it('never shapes the offer below a week either: the count of days is not in the result', () => {
    const short = fc.integer({ min: 0, max: LONG_AWAY_DAYS - 1 });
    fc.assert(
      fc.property(short, short, tasks, returning, (one, other, rows, item) => {
        const offerAfter = (days: number) =>
          morningOffer({
            today: TODAY,
            lastOpenedDay: addDays(TODAY, -days),
            tasks: rows,
            returning: item,
          });
        expect(offerAfter(one)).toStrictEqual(offerAfter(other));
        expect(Object.keys(offerAfter(one)).join(' ')).not.toMatch(/day|away|since|last|count/i);
      }),
    );
  });
});
