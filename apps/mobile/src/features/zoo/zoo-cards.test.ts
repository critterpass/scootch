import { describe, expect, it } from '@jest/globals';

import {
  asRows,
  fixtureMonster,
  fixtureMonsters,
  fixtureTask,
} from '../reveal/registry/keep-fixtures';

import { BINDER_SORTS, binderOpen, cardDataFor, cardSpokenLabel, zooCards } from './zoo-cards';

const caught = fixtureMonsters(41);
const wild = { ...fixtureMonster(99), number: null, caughtOn: null, caughtAt: null };
const monsters = [...asRows(caught), wild];
const numbers = (cards: readonly { number: number }[]) => cards.map((card) => card.number);

describe('the zoo', () => {
  it('lists every caught monster, newest first, with or without Plus', () => {
    const expected = caught.map((monster) => monster.number).reverse();
    expect(numbers(zooCards(monsters, false))).toEqual(expected);
    expect(numbers(zooCards(monsters, true))).toEqual(expected);
  });

  it('leaves out a monster that has not been caught', () => {
    expect(zooCards(monsters, false).some((card) => card.id === wild.id)).toBe(false);
  });

  it('sorts only with the binder open, and never drops a card either way', () => {
    expect(binderOpen(false)).toBe(false);
    expect(binderOpen(true)).toBe(true);
    for (const sort of BINDER_SORTS) {
      expect(numbers(zooCards(monsters, false, sort))).toEqual(numbers(zooCards(monsters, false)));
      expect(numbers(zooCards(monsters, true, sort)).sort()).toEqual(
        numbers(zooCards(monsters, false)).sort(),
      );
    }
    const byLurked = zooCards(monsters, true, 'daysLurked').map((card) => card.daysLurked);
    expect(byLurked).toEqual([...byLurked].sort((a, b) => b - a));
    expect(zooCards(monsters, true, 'rarity')[0]?.rarity).toBe('rare');
    const bodies = zooCards(monsters, true, 'bodyType').map((card) => card.spec.bodyType);
    expect(bodies).toEqual([...bodies].sort());
  });

  it('reads a card out as one label with its name, rarity and stats', () => {
    const monster = {
      ...fixtureMonster(0),
      daysLurked: 120,
      rarity: 'rare' as const,
      catchMinutes: 9,
      dread: 4,
    };
    const label = cardSpokenLabel(cardDataFor(monster, fixtureTask(0)), 'en');
    expect(label).toBe('Molar, Rare, No. 001, Lurked 120 days, Dread 4/5, Caught in 9 minutes');
  });
});
