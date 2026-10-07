import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { parkTasks } from '../drawer';

import { addDays } from './local-time';
import { rollOver, type RolloverInput } from './rollover';
import { TODAY, drawerItem, taskRow, taskRowArbitrary } from './test/rows';
import { FREE_STARTS_PER_DAY, startsLeft, todayState } from './today-state';

const YESTERDAY = addDays(TODAY, -1);
const base: RolloverInput = {
  today: TODAY,
  tasks: [],
  openedDays: [YESTERDAY],
  lastOpenedDay: YESTERDAY,
  parkedIds: [],
  deadlineReturns: false,
};
const roll = (over: Partial<RolloverInput>) => rollOver({ ...base, ...over });

describe('what becomes of an unfinished task on a new day', () => {
  it.each(['set', 'started'] as const)('carries a task left %s yesterday, once', (status) => {
    const left = taskRow({ localDate: YESTERDAY, status });
    const { carried, parked } = roll({ tasks: [left] });
    expect(carried).toEqual({ ...left, localDate: TODAY, carriedOver: true, status: 'set' });
    expect(parked).toEqual([]);

    // Left again on its carried morning, it goes to the drawer the day after.
    const tomorrow = addDays(TODAY, 1);
    const again = rollOver({
      ...base,
      today: tomorrow,
      tasks: [carried!],
      openedDays: [YESTERDAY, TODAY],
      lastOpenedDay: TODAY,
    });
    expect(again).toEqual({ carried: null, parked: [carried] });
  });

  it.each([1, 2, 5])(
    'carries a task carried on purpose when its morning was skipped by %i days',
    (late) => {
      const meant = taskRow({ localDate: addDays(TODAY, -late), carriedOver: true });
      const opened = addDays(TODAY, -late - 1);
      const { carried } = roll({ tasks: [meant], openedDays: [opened], lastOpenedDay: opened });
      expect(carried).toMatchObject({ id: meant.id, localDate: TODAY, carriedOver: true });
    },
  );

  it.each([7, 40])('carries nothing after %i days away: everything waits in the drawer', (gap) => {
    const last = addDays(TODAY, -gap);
    const left = taskRow({ localDate: last });
    expect(roll({ tasks: [left], openedDays: [last], lastOpenedDay: last })).toEqual({
      carried: null,
      parked: [left],
    });
  });

  it('carries the newest of several and parks the others', () => {
    const older = taskRow({ id: 'task-old', localDate: addDays(TODAY, -3) });
    const newer = taskRow({ id: 'task-new', localDate: YESTERDAY });
    const { carried, parked } = roll({ tasks: [older, newer] });
    expect(carried?.id).toBe('task-new');
    expect(parked).toEqual([older]);
  });

  it('never puts a serious task in front of the person unasked', () => {
    const heavy = taskRow({ localDate: YESTERDAY, screen: 'serious' });
    expect(roll({ tasks: [heavy] })).toEqual({ carried: null, parked: [heavy] });
    const funny = { ...heavy, seriousOverridden: true };
    expect(roll({ tasks: [funny] }).carried?.id).toBe(heavy.id);
  });

  it('carries nothing beside a task already open today, or a dated thing back this morning', () => {
    const left = taskRow({ id: 'task-left', localDate: YESTERDAY });
    const open = taskRow({ id: 'task-open' });
    expect(roll({ tasks: [left, open] })).toEqual({ carried: null, parked: [left] });
    expect(roll({ tasks: [left], deadlineReturns: true })).toEqual({
      carried: null,
      parked: [left],
    });
  });

  it('leaves alone what is finished, what waits for a later day and what is already parked', () => {
    const tasks = [
      taskRow({ id: 'task-done', localDate: YESTERDAY, status: 'finished' }),
      taskRow({ id: 'task-ahead', localDate: addDays(TODAY, 1), carriedOver: true }),
      taskRow({ id: 'task-parked', localDate: addDays(TODAY, -9) }),
    ];
    expect(roll({ tasks, parkedIds: ['task-parked'] })).toEqual({ carried: null, parked: [] });
  });

  it(
    'loses nothing, carries at most one, and does nothing more the second time',
    { timeout: 60_000 },
    () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.tuple(taskRowArbitrary, fc.integer({ min: -45, max: 1 })), {
            selector: ([task]) => task.id,
            maxLength: 8,
          }),
          fc.integer({ min: 1, max: 45 }),
          fc.boolean(),
          (made, away, deadlineReturns) => {
            const tasks = made.map(([task, offset]) => ({
              ...task,
              localDate: addDays(TODAY, offset),
            }));
            const lastOpenedDay = addDays(TODAY, -away);
            const input: RolloverInput = {
              ...base,
              tasks,
              openedDays: [lastOpenedDay],
              lastOpenedDay,
              deadlineReturns,
            };
            const { carried, parked } = rollOver(input);
            const moved = [...(carried ? [carried.id] : []), ...parked.map((task) => task.id)];
            const unfinishedBefore = tasks
              .filter((task) => task.status !== 'finished' && task.localDate < TODAY)
              .map((task) => task.id);
            expect([...moved].sort()).toEqual([...unfinishedBefore].sort());
            if (away >= 7 || deadlineReturns) expect(carried).toBeNull();

            // Applied, and the day opened once more: nothing moves again.
            const after = tasks.map((task) => (task.id === carried?.id ? carried : task));
            const again = rollOver({
              ...input,
              tasks: after,
              openedDays: [lastOpenedDay, TODAY],
              parkedIds: parked.map((task) => task.id),
            });
            expect(again).toEqual({ carried: null, parked: [] });
          },
        ),
      );
    },
  );
});

describe('a task put into the drawer whole', () => {
  const now = Date.parse('2026-10-06T09:00:00Z');

  it('keeps its id, its first mention and its date, and fades or returns as any item does', () => {
    const undated = taskRow({ id: 'task-u', firstMentionedOn: addDays(TODAY, -5) });
    const dated = taskRow({
      id: 'task-d',
      text: 'Renew the passport',
      dueDate: addDays(TODAY, 20),
    });
    const { drawer } = parkTasks({ drawer: [], tasks: [undated, dated], today: TODAY, now });
    expect(drawer).toEqual([
      expect.objectContaining({
        id: 'task-u',
        text: undated.text,
        firstMentionedOn: addDays(TODAY, -5),
        fadesOn: addDays(TODAY, 14),
        returnOn: null,
      }),
      expect.objectContaining({ id: 'task-d', fadesOn: null, returnOn: addDays(TODAY, 13) }),
    ]);
  });

  it('is not handed straight back: a date already here returns tomorrow at the soonest', () => {
    const due = taskRow({ dueDate: TODAY });
    const { drawer } = parkTasks({ drawer: [], tasks: [due], today: TODAY, now });
    expect(drawer[0]?.returnOn).toBe(addDays(TODAY, 1));
  });

  it('takes the place of an item for the same thing, keeping the earlier mention and its date', () => {
    const known = drawerItem({
      id: 'item-known',
      text: '  email the DENTIST about thursday ',
      firstMentionedOn: addDays(TODAY, -30),
      dueDate: addDays(TODAY, 2),
      fadesOn: null,
    });
    const other = drawerItem({ id: 'item-other' });
    const { drawer, replacedIds } = parkTasks({
      drawer: [known, other],
      tasks: [taskRow()],
      today: TODAY,
      now,
    });
    expect(replacedIds).toEqual(['item-known']);
    expect(drawer.map((item) => item.id)).toEqual(['item-other', 'task-a']);
    expect(drawer[1]).toMatchObject({
      firstMentionedOn: addDays(TODAY, -30),
      dueDate: addDays(TODAY, 2),
    });
  });
});

describe('a start is counted on the day it was used', () => {
  it('still counts a task carried on to tomorrow, and gives back one that was let go', () => {
    const carried = taskRow({ localDate: addDays(TODAY, 1), carriedOver: true });
    const session = {
      id: 'session-a',
      taskId: carried.id,
      localDate: TODAY,
      plannedMinutes: 10,
      treat: null,
      startedAt: '2026-10-06T09:45:00+01:00',
      endsAt: '2026-10-06T09:55:00+01:00',
      endedAt: '2026-10-06T09:55:00+01:00',
      outcome: 'not_finished' as const,
      finishMethod: null,
      notFinishedChoice: 'carry_on' as const,
      tableId: null,
    };
    const input = { localDate: TODAY, tasks: [carried], plus: false };
    expect(startsLeft({ ...input, sessions: [session] })).toBe(FREE_STARTS_PER_DAY - 1);
    expect(startsLeft({ ...input, sessions: [] })).toBe(FREE_STARTS_PER_DAY);
    // A task started twice today used one start.
    expect(startsLeft({ ...input, sessions: [session, { ...session, id: 'session-b' }] })).toBe(
      FREE_STARTS_PER_DAY - 1,
    );
    expect(
      todayState({
        ...input,
        sessions: [session],
        day: {
          localDate: TODAY,
          status: 'done',
          openedAt: session.startedAt,
          morningLine: null,
          energy: null,
        },
      }),
    ).toEqual({ kind: 'done_for_today', startsLeft: FREE_STARTS_PER_DAY - 1 });
  });
});
