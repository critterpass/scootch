import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addDays } from './local-time';
import {
  TODAY,
  dayRow,
  sessionRow,
  sessionRowArbitrary,
  taskRow,
  taskRowArbitrary,
} from './test/rows';
import {
  FREE_STARTS_PER_DAY,
  PLUS_STARTS_PER_DAY,
  startsAllowed,
  startsLeft,
  todayState,
} from './today-state';

const base = { localDate: TODAY, day: dayRow(), tasks: [], sessions: [], plus: false };

describe('how many things may be started today', () => {
  it('is ten when free and twenty-five with Plus', () => {
    expect(FREE_STARTS_PER_DAY).toBe(10);
    expect(PLUS_STARTS_PER_DAY).toBe(25);
    expect(startsAllowed(false)).toBe(FREE_STARTS_PER_DAY);
    expect(startsAllowed(true)).toBe(PLUS_STARTS_PER_DAY);
  });

  const finished = (count: number) => Array.from({ length: count }, () => 'finished' as const);

  it.each([
    [false, [], FREE_STARTS_PER_DAY],
    [false, ['set'], FREE_STARTS_PER_DAY],
    [false, ['started'], FREE_STARTS_PER_DAY - 1],
    [false, ['finished'], FREE_STARTS_PER_DAY - 1],
    [false, ['finished', 'finished'], FREE_STARTS_PER_DAY - 2],
    [false, finished(FREE_STARTS_PER_DAY - 1), 1],
    // The cap: the last start a free phone has, and nothing below nought past it.
    [false, [...finished(FREE_STARTS_PER_DAY - 1), 'started'], 0],
    [false, finished(FREE_STARTS_PER_DAY + 1), 0],
    [true, ['finished'], PLUS_STARTS_PER_DAY - 1],
    // Plus carries on where the free limit stops.
    [true, finished(FREE_STARTS_PER_DAY), PLUS_STARTS_PER_DAY - FREE_STARTS_PER_DAY],
    [true, [...finished(PLUS_STARTS_PER_DAY - 1), 'started'], 0],
  ] as const)('plus %s with tasks %j leaves %i', (plus, statuses, left) => {
    const tasks = statuses.map((status, index) => taskRow({ id: `task-${index}x`, status }));
    expect(startsLeft({ localDate: TODAY, tasks, plus })).toBe(left);
  });

  it('does not count another day, and a task that was let go has no row to count', () => {
    const tasks = [taskRow({ localDate: addDays(TODAY, -1), status: 'finished' })];
    expect(startsLeft({ localDate: TODAY, tasks, plus: false })).toBe(FREE_STARTS_PER_DAY);
  });
});

describe("today's state", () => {
  it('is nothing yet before a task is set, also before the day has a row', () => {
    const untouched = { kind: 'nothing_yet', startsLeft: FREE_STARTS_PER_DAY };
    expect(todayState(base)).toEqual(untouched);
    expect(todayState({ ...base, day: null })).toEqual(untouched);
  });

  it('is task set, then in session while a session row is open', () => {
    const task = taskRow();
    expect(todayState({ ...base, tasks: [task] })).toEqual({
      kind: 'task_set',
      task,
      startsLeft: FREE_STARTS_PER_DAY,
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
      startsLeft: FREE_STARTS_PER_DAY - 1,
    });
    expect(todayState({ ...base, tasks: [finished], plus: true })).toEqual({
      kind: 'done_for_today',
      startsLeft: PLUS_STARTS_PER_DAY - 1,
    });
    expect(todayState({ ...base, day: dayRow({ status: 'done' }) }).kind).toBe('done_for_today');
  });

  it('shows the next thing a Plus user sets after finishing one', () => {
    const tasks = [
      taskRow({ status: 'finished' }),
      taskRow({ id: 'task-b', createdAt: '2026-10-06T11:00:00+01:00' }),
    ];
    const state = todayState({ ...base, day: dayRow({ status: 'done' }), tasks, plus: true });
    expect(state).toEqual({
      kind: 'task_set',
      task: tasks[1],
      startsLeft: PLUS_STARTS_PER_DAY - 1,
    });
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

  it('rests as a finished day does once the care screen was closed, with nothing set', () => {
    const state = todayState({
      localDate: TODAY,
      day: dayRow({ status: 'quiet' }),
      tasks: [],
      sessions: [],
      plus: false,
    });
    expect(state.kind).toBe('done_for_today');
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

  it('keeps a start used by a thing that was let go after a session ran', () => {
    const base = { localDate: TODAY, tasks: [], sessions: [], plus: false };
    expect(startsLeft({ ...base, spent: 1 })).toBe(startsAllowed(false) - 1);
    expect(todayState({ ...base, day: null, spent: startsAllowed(false) })).toEqual({
      kind: 'nothing_yet',
      startsLeft: 0,
    });
  });
});
