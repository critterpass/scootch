import { describe, expect, it } from '@jest/globals';

import {
  asRows,
  fixtureMonster,
  fixtureMonsters,
  fixtureTask,
} from '../reveal/registry/keep-fixtures';

import { binderOpen, cardDataFor, cardSpokenLabel, guessLine, isCaught } from './zoo-cards';

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

describe("a card's guess line", () => {
  const took11 = { ...fixtureMonster(0), catchMinutes: 11 };

  it('is absent with no guess, so the card is as it was', () => {
    expect(guessLine(took11, 'en')).toBeNull();
    expect(guessLine({ ...took11, guessMinutes: null }, 'en')).toBeNull();
  });

  it('prints a guess longer than the real time as two plain sentences', () => {
    expect(guessLine({ ...took11, guessMinutes: 120 }, 'en')).toBe(
      'Thought 2 hours. Took 11 minutes.',
    );
    expect(guessLine({ ...took11, guessMinutes: 120 }, 'vi')).toBe('Tưởng 2 tiếng. Mất 11 phút.');
  });

  it('prints a guess shorter than the real time the same way, with nothing added', () => {
    expect(guessLine({ ...took11, guessMinutes: 30, catchMinutes: 95 }, 'en')).toBe(
      'Thought 30 minutes. Took 1 hour 35 minutes.',
    );
    expect(guessLine({ ...took11, guessMinutes: 60, catchMinutes: 60 }, 'en')).toBe(
      'Thought 1 hour. Took 1 hour.',
    );
  });

  it('never weighs one number against the other, in either language', () => {
    const banned = /faster|slower|only|just|nailed|nhanh|chậm|chỉ/i;
    for (const language of ['en', 'vi'] as const) {
      for (const guessMinutes of [30, 60, 120, 180, 360] as const) {
        for (const catchMinutes of [1, 11, 60, 400]) {
          const line = guessLine({ guessMinutes, catchMinutes }, language) ?? '';
          expect(line).not.toMatch(banned);
          expect(line.split('. ')).toHaveLength(2);
        }
      }
    }
  });
});
