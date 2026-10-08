import { describe, expect, it } from '@jest/globals';

import type { MonsterRow, TaskRow } from '@scootch/domain';

import {
  asRows,
  fixtureMonster,
  fixtureMonsters,
  fixtureTask,
} from '../reveal/registry/keep-fixtures';

import {
  monthPages,
  pageOfToday,
  pocketStat,
  POCKETS,
  shelfCards,
  SHELF_SORTS,
  sortNeedsPlus,
  wildOnes,
} from './binder';

const caught = fixtureMonsters(41);
const numbers = (cards: readonly { number: number }[]) => cards.map((card) => card.number);
const uncaught = (index: number): MonsterRow => ({
  ...fixtureMonster(index),
  number: null,
  caughtOn: null,
  caughtAt: null,
  rarity: null,
  daysLurked: null,
  catchMinutes: null,
  dread: null,
});
const waiting = (index: number, changes: Partial<TaskRow> = {}): TaskRow => ({
  ...fixtureTask(index),
  status: 'set',
  finishedAt: null,
  ...changes,
});

describe('the shelf', () => {
  const monsters = [...asRows(caught), uncaught(99)];

  it('holds every caught card, newest first, with or without Plus', () => {
    const expected = caught.map((monster) => monster.number).reverse();
    expect(numbers(shelfCards(monsters, 'newest', false))).toEqual(expected);
    expect(numbers(shelfCards(monsters, 'newest', true))).toEqual(expected);
  });

  it('keeps the other three orders for Plus, and never drops a card either way', () => {
    expect(SHELF_SORTS.filter(sortNeedsPlus)).toEqual(['longest', 'fastest', 'rarest']);
    for (const sort of SHELF_SORTS) {
      expect(numbers(shelfCards(monsters, sort, false))).toEqual(
        numbers(shelfCards(monsters, 'newest', false)),
      );
      expect(numbers(shelfCards(monsters, sort, true)).sort()).toEqual(
        numbers(shelfCards(monsters, 'newest', true)).sort(),
      );
    }
  });

  it('puts the longest lurker, the quickest catch and the rarest card first', () => {
    const lurked = shelfCards(monsters, 'longest', true).map((card) => card.daysLurked);
    expect(lurked).toEqual([...lurked].sort((a, b) => b - a));
    const minutes = shelfCards(monsters, 'fastest', true).map((card) => card.catchMinutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    expect(shelfCards(monsters, 'rarest', true)[0]?.rarity).toBe('rare');
  });

  it('writes under each pocket the number that matters for the order it is in', () => {
    const card = {
      ...fixtureMonster(0),
      daysLurked: 214,
      catchMinutes: 9,
      rarity: 'rare' as const,
    };
    expect(pocketStat(card, 'newest', 'en')).toBe('Mon 5 Oct');
    expect(pocketStat(card, 'longest', 'en')).toBe('214 days');
    expect(pocketStat(card, 'fastest', 'en')).toBe('9 min');
    expect(pocketStat(card, 'rarest', 'en')).toBe('Epic');
  });
});

describe('the month pages', () => {
  const onDay = (index: number, day: string) => ({ ...fixtureMonster(index), caughtOn: day });

  it('always has this month, even while nothing is in it', () => {
    expect(monthPages([], '2026-10-08')).toEqual([
      { month: '2026-10', cards: [], caught: 0, complete: false },
    ]);
    expect(pageOfToday([], '2026-10-08').caught).toBe(0);
  });

  it('gives each month its first nine catches in the order they were caught', () => {
    const september = Array.from({ length: 11 }, (_, index) => onDay(index, '2026-09-12'));
    const october = [onDay(20, '2026-10-01'), onDay(21, '2026-10-06')];
    const pages = monthPages([...october, ...september].reverse(), '2026-10-08');
    expect(pages.map((page) => page.month)).toEqual(['2026-09', '2026-10']);
    expect(numbers(pages[0]?.cards ?? [])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pages[0]).toMatchObject({ caught: 11, complete: true });
    expect(pages[1]).toMatchObject({ caught: 2, complete: false });
    expect(pageOfToday([...october, ...september], '2026-10-08').cards).toHaveLength(2);
  });

  it('is stamped at nine and not before', () => {
    const eight = Array.from({ length: POCKETS - 1 }, (_, index) => onDay(index, '2026-10-02'));
    expect(pageOfToday(eight, '2026-10-08').complete).toBe(false);
    expect(pageOfToday([...eight, onDay(30, '2026-10-07')], '2026-10-08').complete).toBe(true);
  });
});

describe('the monsters still wild', () => {
  const tasks = (...rows: TaskRow[]) => new Map(rows.map((row) => [row.id, row]));

  it("are hatched, not caught, and on a thing still to do, with the thing's own days", () => {
    const wild = wildOnes(
      [uncaught(0), fixtureMonster(1)],
      tasks(waiting(0, { firstMentionedOn: '2026-10-05' }), fixtureTask(1)),
      '2026-10-08',
      false,
    );
    expect(wild.map((one) => [one.monster.id, one.day])).toEqual([['fixture-monster-0', 4]]);
  });

  it('never include a serious task, with or without "it\'s fine, be funny"', () => {
    const serious = waiting(0, { screen: 'serious' });
    const overridden = waiting(1, { screen: 'serious', seriousOverridden: true });
    expect(
      wildOnes([uncaught(0), uncaught(1)], tasks(serious, overridden), '2026-10-08', false),
    ).toEqual([]);
  });

  it('are none on a crisis day, and none whose task is gone', () => {
    expect(wildOnes([uncaught(0)], tasks(waiting(0)), '2026-10-08', true)).toEqual([]);
    expect(wildOnes([uncaught(0)], tasks(), '2026-10-08', false)).toEqual([]);
  });
});
