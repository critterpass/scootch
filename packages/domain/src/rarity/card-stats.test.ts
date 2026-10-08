import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { cardRaritySchema, type IsoDate } from '../contracts';
import { MINUTE_MS, addDays, instantFromIso } from '../day';
import { PURCHASE_STATES, unlockedBy } from '../entitlements';

import {
  RARE_FROM_DAYS_LURKED,
  UNCOMMON_FROM_DAYS_LURKED,
  cardStats,
  catchMinutes,
  guessAndReal,
  type TaskHistory,
} from './card-stats';

const CAUGHT: IsoDate = '2026-10-06';
/** A separate copy with the same contents. */
const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const start = instantFromIso('2026-10-06T14:43:00+01:00');
const sitting = (minutes: number, from = start) => ({
  startedAt: from,
  endedAt: from + minutes * MINUTE_MS,
});

function history(over: Partial<TaskHistory> & { lurked?: number } = {}): TaskHistory {
  const { lurked = 0, ...rest } = over;
  return {
    firstMentionedOn: addDays(CAUGHT, -lurked),
    caughtOn: CAUGHT,
    carriedOverCount: 0,
    shrinkCount: 0,
    sittings: [sitting(10)],
    ...rest,
  };
}

const anyHistory: fc.Arbitrary<TaskHistory> = fc
  .record({
    lurked: fc.integer({ min: 0, max: 1200 }),
    carriedOverCount: fc.integer({ min: 0, max: 12 }),
    shrinkCount: fc.integer({ min: 0, max: 12 }),
    sittings: fc.array(fc.integer({ min: 0, max: 50 * MINUTE_MS }), { maxLength: 6 }).map((all) =>
      all.map((length, index) => ({
        startedAt: start + index * 60 * MINUTE_MS,
        endedAt: start + index * 60 * MINUTE_MS + length,
      })),
    ),
  })
  .map(history);

describe('the stats on a caught card', () => {
  it("gives the design's card: lurked 214 days, caught in 9 minutes, four pips of dread, rare", () => {
    // "He's lived in your inbox since March": 214 days before Tuesday 6 October 2026.
    const molar = history({ firstMentionedOn: '2026-03-06', sittings: [sitting(9)] });
    expect(cardStats(molar)).toEqual({
      daysLurked: 214,
      catchMinutes: 9,
      dread: 4,
      rarity: 'rare',
    });
  });

  it.each([
    [0, 'common'],
    [UNCOMMON_FROM_DAYS_LURKED - 1, 'common'],
    [UNCOMMON_FROM_DAYS_LURKED, 'uncommon'],
    [RARE_FROM_DAYS_LURKED - 1, 'uncommon'],
    [RARE_FROM_DAYS_LURKED, 'rare'],
    [1200, 'rare'],
  ])('a task that lurked %i days is %s', (lurked, rarity) => {
    expect(cardStats(history({ lurked })).rarity).toBe(rarity);
  });

  it.each([
    // days lurked, carried over, shrunk, pips
    [0, 0, 0, 1],
    [1, 0, 0, 1],
    [2, 0, 0, 2],
    [13, 0, 0, 2],
    [14, 0, 0, 3],
    [89, 0, 0, 3],
    [90, 0, 0, 4],
    [364, 0, 0, 4],
    [365, 0, 0, 5],
    [0, 1, 0, 1],
    [0, 1, 1, 2],
    [0, 0, 2, 2],
    [214, 2, 0, 5],
    [900, 5, 5, 5],
  ])('lurked %i days, carried over %i, shrunk %i: dread %i', (lurked, carried, shrunk, dread) => {
    const stats = cardStats(history({ lurked, carriedOverCount: carried, shrinkCount: shrunk }));
    expect(stats.dread).toBe(dread);
  });

  it('counts every sitting, rounds up to the minute and never shows zero', () => {
    expect(catchMinutes([])).toBe(1);
    expect(catchMinutes([{ startedAt: start, endedAt: start + 20_000 }])).toBe(1);
    expect(catchMinutes([{ startedAt: start, endedAt: start + 8 * MINUTE_MS + 1 }])).toBe(9);
    expect(catchMinutes([sitting(10), sitting(25, start + 90 * MINUTE_MS)])).toBe(35);
    expect(catchMinutes([{ startedAt: start, endedAt: start - MINUTE_MS }])).toBe(1);
  });

  it('never shows fewer than zero days for a task dated after its catch', () => {
    expect(cardStats(history({ firstMentionedOn: addDays(CAUGHT, 2) })).daysLurked).toBe(0);
  });
});

describe('rarity properties', { timeout: 60_000 }, () => {
  it('is the same card for the same history, however many times it is worked out', () => {
    fc.assert(
      fc.property(anyHistory, (one) => {
        const stats = cardStats(one);
        expect(cardStats(copyOf(one))).toStrictEqual(stats);
        expect(cardRaritySchema.options).toContain(stats.rarity);
        expect(stats.dread).toBeGreaterThanOrEqual(1);
        expect(stats.dread).toBeLessThanOrEqual(5);
        expect(stats.catchMinutes).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it('is unchanged by any entitlement state, even one handed in beside the history', () => {
    fc.assert(
      fc.property(anyHistory, fc.constantFrom(...PURCHASE_STATES), (one, purchase) => {
        const smuggled = { ...one, purchase, ...unlockedBy(purchase), plus: true, rarity: 'rare' };
        expect(cardStats(smuggled)).toStrictEqual(cardStats(one));
      }),
    );
  });

  it('cannot be raised by sitting again, carrying over or shrinking: only by days lurked', () => {
    const levels = cardRaritySchema.options;
    fc.assert(
      fc.property(anyHistory, anyHistory, (one, other) => {
        const sameDays = { ...other, firstMentionedOn: one.firstMentionedOn };
        expect(cardStats(sameDays).rarity).toBe(cardStats(one).rarity);

        const [shorter, longer] =
          one.firstMentionedOn >= other.firstMentionedOn ? [one, other] : [other, one];
        expect(levels.indexOf(cardStats(longer).rarity)).toBeGreaterThanOrEqual(
          levels.indexOf(cardStats(shorter).rarity),
        );
      }),
    );
  });
});

describe('the guess beside the real time', () => {
  it('is carried on the stats when a guess was made, and leaves them as they were when not', () => {
    const guessed = cardStats(history({ guessMinutes: 120, sittings: [sitting(11)] }));
    expect(guessed).toMatchObject({ catchMinutes: 11, guessMinutes: 120 });

    for (const none of [history(), history({ guessMinutes: null })]) {
      expect(cardStats(none)).toStrictEqual({
        daysLurked: 0,
        catchMinutes: 10,
        dread: 1,
        rarity: 'common',
      });
    }
  });

  it('changes nothing else on the card: a guess moves no stat', () => {
    fc.assert(
      fc.property(anyHistory, fc.constantFrom(30, 60, 120, 180, 360), (one, guessMinutes) => {
        const { guessMinutes: kept, ...rest } = cardStats({ ...one, guessMinutes });
        expect(kept).toBe(guessMinutes);
        expect(rest).toStrictEqual(cardStats(one));
      }),
    );
  });

  it.each([
    ['no guess', undefined, 11, null],
    ['a guess cleared', null, 11, null],
    ['a thing not caught yet', 120, null, null],
    ['a guess longer than it took', 120, 11, { thoughtMinutes: 120, tookMinutes: 11 }],
    ['a guess the same as it took', 30, 30, { thoughtMinutes: 30, tookMinutes: 30 }],
    ['a guess shorter than it took', 30, 95, { thoughtMinutes: 30, tookMinutes: 95 }],
  ])('%s', (_name, guessMinutes, took, pair) => {
    expect(guessAndReal({ guessMinutes, catchMinutes: took })).toStrictEqual(pair);
  });

  it('gives the two numbers and nothing that weighs one against the other', () => {
    const anyPair = fc.tuple(
      fc.constantFrom(30, 60, 120, 180, 360),
      fc.integer({ min: 1, max: 600 }),
    );
    fc.assert(
      fc.property(anyPair, ([guessMinutes, took]) => {
        const pair = guessAndReal({ guessMinutes, catchMinutes: took });
        // Whichever way the guess went, the same two fields come back, as they were given.
        expect(Object.keys(pair ?? {}).sort()).toEqual(['thoughtMinutes', 'tookMinutes']);
        expect(pair).toEqual({ thoughtMinutes: guessMinutes, tookMinutes: took });
      }),
    );
  });
});
