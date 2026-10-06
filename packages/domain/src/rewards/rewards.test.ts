import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { MINUTE_MS, addDays, instantFromIso } from '../day';
import { PURCHASE_STATES, unlockedBy } from '../entitlements';
import type { TaskHistory } from '../rarity';

import { isoWeekOf, recordBarFor } from './record-bar';
import { sessionEarnings, type Earning, type FinishedSession } from './session-earnings';
import { SURPRISE_DROP_CHANCE, surpriseDropFor } from './surprise-drop';

/** A separate copy with the same contents. */
const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const start = instantFromIso('2026-10-06T14:43:00+01:00');
const molar: TaskHistory = {
  firstMentionedOn: '2026-03-06',
  caughtOn: '2026-10-06',
  carriedOverCount: 0,
  shrinkCount: 0,
  sittings: [{ startedAt: start, endedAt: start + 9 * MINUTE_MS }],
};

/** The first catch that drops, and the first that does not, for the seed `phone-seed`. */
const catchNumbers = Array.from({ length: 200 }, (_, index) => index + 1);
const dropping = catchNumbers.find((n) => surpriseDropFor({ seed: 'phone-seed', catchNumber: n }));
const plain = catchNumbers.find((n) => !surpriseDropFor({ seed: 'phone-seed', catchNumber: n }));

function finished(over: Partial<FinishedSession> = {}): FinishedSession {
  return {
    ending: 'finished',
    tone: 'full',
    history: molar,
    treat: 'Coffee',
    dayHasBar: false,
    drop: { seed: 'phone-seed', catchNumber: plain ?? 0 },
    ...over,
  };
}

const kinds = (earned: readonly Earning[]) => earned.map((one) => one.kind);

describe('what a session earns', () => {
  it('finds a catch that drops and one that does not for the fixed seed', () => {
    expect(dropping).toBeDefined();
    expect(plain).toBeDefined();
  });

  it('gives a finish the start, the card, a world piece, the bar and the treat, in that order', () => {
    expect(sessionEarnings(finished())).toEqual([
      { kind: 'start' },
      {
        kind: 'card',
        number: plain,
        stats: { daysLurked: 214, catchMinutes: 9, dread: 4, rarity: 'rare' },
      },
      { kind: 'world_piece', piece: 'monster' },
      {
        kind: 'record_bar',
        bar: { localDate: '2026-10-06', week: '2026-W41', position: 2, instrument: 'bassline' },
      },
      { kind: 'treat', treat: 'Coffee' },
    ]);
  });

  it('adds the surprise last, on a catch whose draw comes up', () => {
    const earned = sessionEarnings(
      finished({ drop: { seed: 'phone-seed', catchNumber: dropping ?? 0 } }),
    );
    expect(kinds(earned)).toEqual([
      'start',
      'card',
      'world_piece',
      'record_bar',
      'treat',
      'surprise_drop',
    ]);
  });

  it('hands over no treat when none was named, and no second bar on a day that has one', () => {
    expect(kinds(sessionEarnings(finished({ treat: null, dayHasBar: true })))).toEqual([
      'start',
      'card',
      'world_piece',
    ]);
  });

  it('leaves a serious task its plain piece and its bar: no card, no treat ceremony, no surprise', () => {
    const drop = { seed: 'phone-seed', catchNumber: dropping ?? 0 };
    expect(sessionEarnings(finished({ tone: 'quiet', drop }))).toEqual([
      { kind: 'start' },
      { kind: 'world_piece', piece: 'plain' },
      {
        kind: 'record_bar',
        bar: { localDate: '2026-10-06', week: '2026-W41', position: 2, instrument: 'bassline' },
      },
    ]);
  });

  it.each(['not_finished', 'left_early'] as const)('keeps only the start when %s', (ending) => {
    expect(sessionEarnings({ ending })).toEqual([{ kind: 'start' }]);
  });

  it('earns nothing and leaves nothing for a task that was let go', () => {
    expect(sessionEarnings({ ending: 'let_go' })).toEqual([]);
  });
});

describe("the week's record", () => {
  it.each([
    ['2026-10-05', '2026-W41', 1, 'keys'],
    ['2026-10-06', '2026-W41', 2, 'bassline'],
    ['2026-10-07', '2026-W41', 3, 'marimba'],
    ['2026-10-08', '2026-W41', 4, 'drums'],
    ['2026-10-09', '2026-W41', 5, 'whistle'],
    ['2026-10-10', '2026-W41', 6, 'bells'],
    ['2026-10-11', '2026-W41', 7, 'choir'],
    // Weeks that cross a year: the week belongs to the year of its Thursday.
    ['2026-12-31', '2026-W53', 4, 'drums'],
    ['2027-01-03', '2026-W53', 7, 'choir'],
    ['2027-01-04', '2027-W01', 1, 'keys'],
    ['2024-12-30', '2025-W01', 1, 'keys'],
  ])('%s is a bar in %s, place %i, on %s', (localDate, week, position, instrument) => {
    expect(recordBarFor(localDate)).toEqual({ localDate, week, position, instrument });
  });
});

const seed = fc.string({ minLength: 1, maxLength: 24 });
const catchNumber = fc.integer({ min: 1, max: 5000 });
const anyFinish = fc
  .record({
    tone: fc.constantFrom('full' as const, 'quiet' as const),
    treat: fc.option(fc.constantFrom('Coffee', 'A walk'), { nil: null }),
    dayHasBar: fc.boolean(),
    seed,
    catchNumber,
    lurked: fc.integer({ min: 0, max: 400 }),
  })
  .map(({ seed: phoneSeed, catchNumber: number, lurked, ...rest }) =>
    finished({
      ...rest,
      history: { ...molar, firstMentionedOn: addDays(molar.caughtOn, -lurked) },
      drop: { seed: phoneSeed, catchNumber: number },
    }),
  );

describe('surprise drop properties', { timeout: 60_000 }, () => {
  it('never follows a serious task, whatever the seed and history', () => {
    fc.assert(
      fc.property(anyFinish, (end) => {
        const earned = kinds(sessionEarnings({ ...end, tone: 'quiet' }));
        expect(earned).not.toContain('surprise_drop');
        expect(earned).not.toContain('card');
        expect(earned).not.toContain('treat');
      }),
    );
  });

  it('is identical for the same history and seed, so a run can be replayed', () => {
    fc.assert(
      fc.property(anyFinish, (end) => {
        expect(sessionEarnings(copyOf(end))).toStrictEqual(sessionEarnings(end));
        expect(surpriseDropFor({ ...end.drop })).toStrictEqual(surpriseDropFor(end.drop));
      }),
    );
  });

  it('cannot be produced or changed by a purchase state handed in beside the session', () => {
    fc.assert(
      fc.property(anyFinish, fc.constantFrom(...PURCHASE_STATES), (end, purchase) => {
        const bought = { purchase, ...unlockedBy(purchase), plus: true, owned: ['outfit'] };
        const smuggled = { ...end, ...bought, drop: { ...end.drop, ...bought } };
        expect(sessionEarnings(smuggled)).toStrictEqual(sessionEarnings(end));
      }),
    );
  });

  it('only ever comes with a finish', () => {
    fc.assert(
      fc.property(fc.constantFrom('not_finished', 'left_early', 'let_go'), (ending) => {
        expect(kinds(sessionEarnings({ ending }))).not.toContain('surprise_drop');
      }),
    );
  });

  it('keeps no schedule: the gaps between drops vary, and a drop says nothing about the next', () => {
    fc.assert(
      fc.property(seed, (phoneSeed) => {
        const drops = Array.from({ length: 4000 }, (_, index) =>
          surpriseDropFor({ seed: phoneSeed, catchNumber: index + 1 }),
        ).map((drop) => drop !== null);
        const total = drops.filter(Boolean).length;
        expect(total / drops.length).toBeGreaterThan(SURPRISE_DROP_CHANCE / 2);
        expect(total / drops.length).toBeLessThan(SURPRISE_DROP_CHANCE * 2);

        const gaps = new Set<number>();
        let last = -1;
        let rightAfterADrop = 0;
        drops.forEach((dropped, index) => {
          if (!dropped) return;
          if (last >= 0) gaps.add(index - last);
          if (last === index - 1) rightAfterADrop += 1;
          last = index;
        });
        expect(gaps.size).toBeGreaterThan(8);
        // After a drop the next catch drops about as often as any other: neither never nor always.
        expect(rightAfterADrop / total).toBeGreaterThan(SURPRISE_DROP_CHANCE / 4);
        expect(rightAfterADrop / total).toBeLessThan(SURPRISE_DROP_CHANCE * 4);
      }),
      { numRuns: 30 },
    );
  });

  it('picks from 0 up to 1, so any item in the folder can come up', () => {
    fc.assert(
      fc.property(seed, catchNumber, (phoneSeed, number) => {
        const drop = surpriseDropFor({ seed: phoneSeed, catchNumber: number });
        if (drop === null) return;
        expect(drop.pick).toBeGreaterThanOrEqual(0);
        expect(drop.pick).toBeLessThan(1);
      }),
    );
  });
});

describe('the ISO week of a day', { timeout: 60_000 }, () => {
  it('gives seven days in a row the same week and the weekdays 1 to 7', () => {
    fc.assert(
      fc.property(fc.integer({ min: -3000, max: 3000 }), (weeks) => {
        const monday = addDays('2026-10-05', weeks * 7);
        const days = [0, 1, 2, 3, 4, 5, 6].map((offset) => isoWeekOf(addDays(monday, offset)));
        expect(new Set(days.map((day) => day.week)).size).toBe(1);
        expect(days.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(isoWeekOf(addDays(monday, 7)).week).not.toBe(days[0]?.week);
      }),
    );
  });
});
