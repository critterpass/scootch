import { describe, expect, it } from '@jest/globals';

import {
  asRows,
  fixtureMonster,
  fixtureMonsters,
  fixtureTask,
} from '../reveal/registry/keep-fixtures';

import { binderOpen, cardDataFor, cardSpokenLabel, isCaught } from './zoo-cards';

const caught = fixtureMonsters(41);
const wild = { ...fixtureMonster(99), number: null, caughtOn: null, caughtAt: null };
const monsters = [...asRows(caught), wild];

describe('a caught card', () => {
  it('is a monster with every card field, and Plus is what opens the binder', () => {
    expect(monsters.filter(isCaught)).toHaveLength(caught.length);
    expect(isCaught(wild)).toBe(false);
    expect(binderOpen(false)).toBe(false);
    expect(binderOpen(true)).toBe(true);
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
    expect(label).toBe('Molar, Epic, No. 001, Lurked 120 days, Dread 4/5, Caught in 9 minutes');
  });
});
