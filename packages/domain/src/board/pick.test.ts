import { describe, expect, it } from 'vitest';

import { deskTask, erase, fillDesk, swapOntoDesk, tickOff } from './actions';
import { addDays } from './moment';
import { boardOrder, minutesFree, pickNext } from './pick';
import { aTask, onDesk, when } from './testing';

const now = when('2026-10-27', '10:00');
const today = now.day;

describe('the pick order', () => {
  it('puts anything due today first, ahead of what has waited and what has slipped', () => {
    const old = aTask(now, { daysOld: 30 }, 'old');
    const slipped = aTask(now, { daysOld: 2, tallies: 4 }, 'slipped');
    const due = aTask(now, { dueDate: today }, 'due');

    expect(pickNext([old, slipped, due], { now })).toEqual({
      task: due,
      reason: 'due today',
    });
  });

  it('treats a day that has come and gone as due today, and a time heard today as due', () => {
    const overdue = aTask(now, { dueDate: addDays(today, -2), daysOld: 5 }, 'overdue');
    const atThree = aTask(now, { heardTime: { day: today, at: '15:00' } }, 'at-three');
    const atNoon = aTask(now, { heardTime: { day: today, at: '12:00' } }, 'at-noon');
    const yesterdaysTime = aTask(
      now,
      { heardTime: { day: addDays(today, -1), at: '09:00' } },
      'stale-time',
    );

    const order = boardOrder([overdue, atThree, atNoon, yesterdaysTime], { now });

    expect(order.map(({ task }) => task.id)).toEqual([
      'at-noon',
      'at-three',
      'overdue',
      'stale-time',
    ]);
    expect(order.slice(0, 3).every(({ reason }) => reason === 'due today')).toBe(true);
    expect(order[3]?.reason).toBe('next up');
  });

  it('then takes what has waited longest, weighing each tally as three days', () => {
    const fresh = aTask(now, { daysOld: 0 }, 'fresh');
    const week = aTask(now, { daysOld: 7 }, 'week');
    const fortnight = aTask(now, { daysOld: 13 }, 'fortnight');
    const fiveTallies = aTask(now, { daysOld: 1, tallies: 5 }, 'five-tallies');

    const order = boardOrder([fresh, week, fortnight, fiveTallies], { now });

    expect(order.map(({ task }) => [task.id, order.find((r) => r.task === task)?.reason])).toEqual([
      ['five-tallies', 'slipped most'],
      ['fortnight', 'waited longest'],
      ['week', 'waited longest'],
      ['fresh', 'next up'],
    ]);
  });

  it('says "slipped most" only of the task that carries the most tallies', () => {
    const one = aTask(now, { daysOld: 0, tallies: 1 }, 'one');
    const two = aTask(now, { daysOld: 0, tallies: 2 }, 'two');

    const order = boardOrder([one, two], { now });

    expect(order.map(({ task, reason }) => [task.id, reason])).toEqual([
      ['two', 'slipped most'],
      ['one', 'waited longest'],
    ]);
  });

  it('does not count accepted reasons as slips', () => {
    const excused = aTask(now, { daysOld: 0, accepted: 4 }, 'excused');
    const older = aTask(now, { daysOld: 1 }, 'older');

    expect(pickNext([excused, older], { now })?.task.id).toBe('older');
  });

  it('then prefers what fits the minutes free, and otherwise the oldest fresh task', () => {
    const long = aTask(now, { daysOld: 1, order: { minutes: 60, swappedAt: null } }, 'long');
    const short = aTask(now, { daysOld: 0, order: { minutes: 10, swappedAt: null } }, 'short');
    const unsized = aTask(now, { daysOld: 0 }, 'unsized');

    expect(pickNext([long, short], { now, freeMinutes: 20 })).toMatchObject({
      task: { id: 'short' },
      reason: 'fits the time',
    });
    // A task whose size was never heard counts as one period.
    expect(pickNext([long, unsized], { now, freeMinutes: 10 })?.task.id).toBe('unsized');
    expect(pickNext([long, short], { now, freeMinutes: 5 })).toMatchObject({
      task: { id: 'long' },
      reason: 'next up',
    });
    expect(pickNext([long, short], { now })?.task.id).toBe('long');
  });

  it('holds a task dated for a later day until its day, unless nothing else is on the board', () => {
    const friday = aTask(now, { dueDate: addDays(today, 3), daysOld: 10 }, 'friday');
    const tomorrow = aTask(now, { dueDate: addDays(today, 1) }, 'tomorrow');
    const fresh = aTask(now, {}, 'fresh');

    expect(pickNext([friday, tomorrow, fresh], { now })?.task.id).toBe('fresh');
    expect(pickNext([friday, tomorrow], { now })).toMatchObject({
      task: { id: 'tomorrow' },
      reason: 'due soon',
    });
    expect(pickNext([friday], { now: when(addDays(today, 3)) })).toMatchObject({
      task: { id: 'friday' },
      reason: 'due today',
    });
  });

  it('never picks a faded task, the task already on the desk, or a finished or erased one', () => {
    const faded = aTask(now, { daysOld: 20 }, 'faded');
    const desk = onDesk(now);
    const done = tickOff(aTask(now, { daysOld: 40 }), now);
    const gone = erase(aTask(now, { daysOld: 50 }), now.at);

    expect(pickNext([faded, desk, done, gone], { now })).toBeNull();
    expect(boardOrder([faded, desk, done, gone], { now }).map(({ task }) => task.id)).toEqual([
      desk.id,
      'faded',
    ]);
  });

  it('gives nothing on an empty board', () => {
    expect(pickNext([], { now })).toBeNull();
  });
});

describe('the desk', () => {
  it('takes his pick when it is empty, and keeps one task at a time', () => {
    const due = aTask(now, { dueDate: today }, 'due');
    const other = aTask(now, {}, 'other');

    const filled = fillDesk([other, due], { now });

    expect(filled.picked).toMatchObject({
      task: { id: 'due', status: 'desk' },
      reason: 'due today',
    });
    expect(deskTask(filled.tasks)?.desk).toEqual({
      since: now.at,
      opened: now.at,
      startedAt: null,
      insideFuse: null,
    });
    expect(fillDesk(filled.tasks, { now }).picked).toBeNull();
  });

  it('allows a swap: the chosen task goes on the desk and the desk task goes back unchanged', () => {
    const first = onDesk(now, { tallies: 1 });
    const second = aTask(now, {}, 'second');

    const swapped = swapOntoDesk([first, second], 'second', now.at + 1000);

    expect(swapped.filter((task) => task.status === 'desk').map((task) => task.id)).toEqual([
      'second',
    ]);
    expect(swapped.find((task) => task.id === first.id)).toMatchObject({
      status: 'board',
      desk: null,
      slips: first.slips,
    });
    expect(deskTask(swapped)?.order.swappedAt).toBe(now.at + 1000);
  });
});

describe('minutes free before a time heard today', () => {
  it('leaves fifteen minutes to get ready before the earliest time still ahead', () => {
    const dentist = aTask(now, { heardTime: { day: today, at: '11:00' } });
    const later = aTask(now, { heardTime: { day: today, at: '16:00' } });
    const gone = aTask(now, { heardTime: { day: today, at: '08:00' } });

    expect(minutesFree([dentist, later, gone], now)).toBe(45);
    expect(minutesFree([gone], now)).toBeNull();
    expect(minutesFree([aTask(now, { heardTime: { day: today, at: '10:10' } })], now)).toBe(0);
  });
});
