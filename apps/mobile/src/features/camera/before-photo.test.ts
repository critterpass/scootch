import { describe, expect, it } from '@jest/globals';

import { DAY_MS, type MonsterRow, type TaskRow } from '@scootch/domain';

import {
  afterFigures,
  afterOffer,
  beforeFromStored,
  HATCH_WINDOW_MS,
  type BeforePhoto,
} from './before-photo';

const taken = Date.parse('2026-10-06T09:00:00.000Z');
const before: BeforePhoto = { uri: 'file:///before.jpg', mode: 'desk', things: 4, takenAt: taken };
const iso = (ms: number) => new Date(ms).toISOString();

function kept(
  over: Partial<MonsterRow> = {},
  screen: TaskRow['screen'] = 'pass',
): { monsters: MonsterRow[]; tasks: Map<string, TaskRow> } {
  const monster = {
    id: 'm1',
    taskId: 't1',
    origin: 'task',
    hatchedAt: iso(taken + 20_000),
    caughtAt: iso(taken + 11 * 60_000),
    catchMinutes: 10,
    ...over,
  } as MonsterRow;
  return { monsters: [monster], tasks: new Map([['t1', { id: 't1', screen } as TaskRow]]) };
}

describe('asking for the second photo', () => {
  const later = taken + 12 * 60_000;

  it('asks once the task that began with the photo is caught, with its minutes', () => {
    expect(afterOffer(before, kept(), later)).toEqual({ minutes: 10 });
  });

  it('does not ask while the monster is still loose, or after a task that was not finished', () => {
    expect(afterOffer(before, kept({ caughtAt: null }), later)).toBeNull();
  });

  it('never asks about a serious task', () => {
    expect(afterOffer(before, kept({}, 'serious'), later)).toBeNull();
    expect(afterOffer(before, kept({}, 'unscreened'), later)).toBeNull();
  });

  it('does not take a monster hatched before the photo, or long after it, for this task', () => {
    expect(afterOffer(before, kept({ hatchedAt: iso(taken - 1000) }), later)).toBeNull();
    const late = kept({ hatchedAt: iso(taken + HATCH_WINDOW_MS + 1000) });
    expect(afterOffer(before, late, taken + 30 * 60_000)).toBeNull();
  });

  it('does not take a haunt or a web monster for the task', () => {
    expect(afterOffer(before, kept({ origin: 'haunt' }), later)).toBeNull();
  });

  it('stops asking after a day, and with nothing kept', () => {
    expect(afterOffer(before, kept(), taken + DAY_MS)).toBeNull();
    expect(afterOffer(null, kept(), later)).toBeNull();
    expect(afterOffer(before, null, later)).toBeNull();
  });
});

describe('the figures under the two photos', () => {
  it('counts the minutes and how many fewer things there are now', () => {
    expect(afterFigures(before, 1, 10)).toEqual({ minutes: 10, gone: 3 });
  });

  it('never claims things gone when as many or more are found', () => {
    expect(afterFigures(before, 4, 10).gone).toBeNull();
    expect(afterFigures(before, 9, 10).gone).toBeNull();
  });

  it('leaves out a figure of nought', () => {
    expect(afterFigures(before, 4, 0)).toEqual({ minutes: null, gone: null });
  });
});

describe('the stored record of the first photo', () => {
  it('reads back what was stored', () => {
    expect(beforeFromStored({ ...before })).toEqual(before);
  });

  it.each([
    null,
    'x',
    {},
    { ...before, uri: '' },
    { ...before, mode: 'paper' },
    { ...before, things: -1 },
    { ...before, takenAt: 'now' },
  ])('keeps nothing for a stored value it cannot read: %j', (stored) => {
    expect(beforeFromStored(stored)).toBeNull();
  });
});
