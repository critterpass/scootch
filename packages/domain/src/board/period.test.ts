import { describe, expect, it } from 'vitest';

import { tickOff } from './actions';
import { HAPPENINGS, happeningFor } from './happenings';
import { logbook } from './logbook';
import {
  finishTask,
  partialCredit,
  periodBeforeHeardTime,
  periodEndsAt,
  periodMinutes,
  startPeriod,
} from './period';
import { DAY_MS, MINUTE_MS } from './moment';
import { aTask, later, onDesk, when } from './testing';

const now = when('2026-10-27', '10:00');

describe('a period', () => {
  it('is ten minutes, fifteen on a pop quiz, and whatever the user chose', () => {
    expect(periodMinutes({})).toBe(10);
    expect(periodMinutes({ happening: 'pop quiz' })).toBe(15);
    expect(periodMinutes({ happening: 'paper plane' })).toBe(10);
    expect(periodMinutes({ chosen: 25, happening: 'pop quiz' })).toBe(25);
  });

  it('ends in time to get ready for a time heard today', () => {
    const task = onDesk(now, { heardTime: { day: now.day, at: '10:30' } });

    expect(periodBeforeHeardTime(25, task, now)).toBe(15);
    expect(periodBeforeHeardTime(10, task, now)).toBe(10);
    expect(periodBeforeHeardTime(10, task, later(now, 16))).toBeNull();
    expect(periodBeforeHeardTime(10, task, later(now, 45))).toBe(10);
  });

  it('runs from the drum', () => {
    const started = startPeriod(onDesk(now), now.at);

    expect(periodEndsAt(started, 10)).toBe(now.at + 10 * MINUTE_MS);
    expect(periodEndsAt(onDesk(now), 10)).toBeNull();
  });
});

describe('partial credit', () => {
  const running = startPeriod(onDesk(now), now.at);
  const end = later(now, 10).at;

  it('can start another period on the same task', () => {
    const again = partialCredit(running, 'another period', end);

    expect(again).toMatchObject({ status: 'desk', desk: { startedAt: end, insideFuse: true } });
  });

  it('can go back on the board with one line for next time, in the user’s words', () => {
    const back = partialCredit(running, 'back on board', end, '  start from page 4 ');

    expect(back).toMatchObject({ status: 'board', desk: null, partialNote: 'start from page 4' });
    expect(partialCredit(back, 'back on board', end, '').partialNote).toBe('start from page 4');
  });

  it('can erase it, quietly', () => {
    expect(partialCredit(running, 'erase', end)).toMatchObject({ status: 'erased', desk: null });
  });
});

describe('a finish', () => {
  it('grades, carves, offers recess and writes the logbook', () => {
    const said = aTask(now, { daysOld: 3 }, 'finish-me');
    const onTheDesk = startPeriod(
      {
        ...said,
        status: 'desk',
        desk: { since: now.at, opened: now.at, startedAt: null, insideFuse: null },
        partialNote: 'page 4',
      },
      now.at + MINUTE_MS,
    );
    const done = later(now, 11);

    const finish = finishTask(onTheDesk, done, 10);

    expect(finish.comment).toBe('good work');
    expect(finish.recessOffered).toBe(true);
    expect(finish.task).toMatchObject({
      status: 'done',
      desk: null,
      partialNote: null,
      done: { at: done.at, day: '2026-10-27', periodMinutes: 10, comment: 'good work' },
    });
    expect(finish.task.done?.carving).toBe(finish.carving.kind);
    expect(finishTask(onTheDesk, done, 10)).toEqual(finish);
  });

  it('on a heavy task leaves no grade and nothing rare', () => {
    const task = startPeriod(onDesk(now, { daysOld: 30 }, 'serious'), now.at);

    const finish = finishTask(task, later(now, 10), 10);

    expect(finish.comment).toBeNull();
    expect(finish.giayKhen).toBe(false);
    expect(['gold star', 'carved ten']).not.toContain(finish.carving.kind);
  });
});

describe('the logbook', () => {
  it('lists finished tasks newest first, with period, date and comment, and nothing else', () => {
    const first = finishTask(startPeriod(onDesk(now), now.at), later(now, 10), 10).task;
    const ticked = tickOff(aTask(now), later(now, 60));
    const second = finishTask(
      startPeriod(onDesk(when('2026-10-28')), when('2026-10-28').at),
      when('2026-10-28', '09:15'),
      15,
    ).task;
    const open = aTask(now);

    const entries = logbook([first, open, second, ticked]);

    expect(entries.map((entry) => [entry.day, entry.periodMinutes])).toEqual([
      ['2026-10-28', 15],
      ['2026-10-27', null],
      ['2026-10-27', 10],
    ]);
    expect(entries[1]).toMatchObject({ comment: null, giayKhen: false });
    expect(Object.keys(entries[0] ?? {}).sort()).toEqual(
      ['at', 'comment', 'day', 'giayKhen', 'periodMinutes', 'taskId', 'text'].sort(),
    );
  });
});

describe('happenings', () => {
  const sessions = Array.from({ length: 4000 }, (_, index) => `task-${index}:${index * DAY_MS}`);

  it('come about one session in four, every kind of them, the same each time for a session', () => {
    const happened = sessions.map((seed) => happeningFor({ seed, care: 'none' }));
    const count = happened.filter((one) => one !== null).length;

    expect(count).toBeGreaterThan(1000 / 1.2);
    expect(count).toBeLessThan(1000 * 1.2);
    expect(new Set(happened.filter((one) => one !== null))).toEqual(new Set(HAPPENINGS));
    expect(sessions.map((seed) => happeningFor({ seed, care: 'none' }))).toEqual(happened);
  });

  it('never come on a serious or crisis task', () => {
    for (const seed of sessions) {
      expect(happeningFor({ seed, care: 'serious' })).toBeNull();
      expect(happeningFor({ seed, care: 'crisis' })).toBeNull();
    }
  });
});
