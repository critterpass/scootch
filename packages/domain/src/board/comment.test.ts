import { describe, expect, it } from 'vitest';

import { carveInto, carvingFor, DOODLES } from './carvings';
import { commentFor, earnsGiayKhen, type CommentInput } from './comment';
import type { CommentStep } from './task';

const seeds = (count: number, prefix = 'task') =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

function comment(over: Partial<CommentInput>): CommentStep | null {
  return commentFor({
    insideFuse: false,
    tallies: 0,
    waitedDays: 0,
    heavy: false,
    seed: 'fixed-seed-that-rolls-no-ten',
    ...over,
  });
}

describe('the comment ladder', () => {
  it.each([
    ['started late, with a tally, said today', { tallies: 1 }, 'fine'],
    ['started late, clean, said today', {}, 'fine'],
    ['inside the fuse, clean, said today', { insideFuse: true }, 'good'],
    ['started late, clean, waited a day', { waitedDays: 1 }, 'good'],
    [
      'inside the fuse, with a tally, waited a day',
      { insideFuse: true, tallies: 2, waitedDays: 1 },
      'good',
    ],
    ['inside the fuse, clean, waited three days', { insideFuse: true, waitedDays: 3 }, 'good work'],
    ['started late, clean, waited a week', { waitedDays: 7 }, 'good work'],
    ['started late, with tallies, waited a month', { tallies: 3, waitedDays: 30 }, 'good'],
  ] as const)('%s: %s', (_, over, step) => {
    expect(comment(over)).toBe(step);
  });

  it('gives the circled 10 to about one in forty finishes strong on all three counts', () => {
    const tens = seeds(8000).filter(
      (seed) => comment({ insideFuse: true, waitedDays: 9, seed }) === 'ten',
    ).length;

    expect(tens).toBeGreaterThan(8000 / 40 / 1.4);
    expect(tens).toBeLessThan((8000 / 40) * 1.4);
  });

  it('never gives the circled 10 unless all three are strong', () => {
    for (const seed of seeds(4000)) {
      expect(comment({ insideFuse: false, waitedDays: 30, seed })).not.toBe('ten');
      expect(comment({ insideFuse: true, tallies: 1, waitedDays: 30, seed })).not.toBe('ten');
      expect(comment({ insideFuse: true, waitedDays: 6, seed })).not.toBe('ten');
    }
  });

  it('is the same every time for the same finish', () => {
    for (const seed of seeds(200)) {
      const input = { insideFuse: true, waitedDays: 10, seed };
      expect(comment(input)).toBe(comment(input));
    }
  });

  it('grades nothing on a serious or crisis task', () => {
    for (const seed of seeds(500)) {
      expect(comment({ heavy: true, insideFuse: true, waitedDays: 30, seed })).toBeNull();
    }
  });
});

describe('the giấy khen', () => {
  it('comes only with a circled 10, and so is always rarer than one', () => {
    const strong = seeds(40_000).map((seed) => ({
      seed,
      step: comment({ insideFuse: true, waitedDays: 9, seed }),
    }));
    const tens = strong.filter(({ step }) => step === 'ten');
    const certificates = strong.filter(({ step, seed }) => earnsGiayKhen(step, seed));

    expect(certificates.length).toBeGreaterThan(0);
    expect(certificates.length).toBeLessThan(tens.length / 2);
    expect(certificates.every(({ step }) => step === 'ten')).toBe(true);
    for (const step of ['fine', 'good', 'good work', null] as const) {
      expect(seeds(2000).some((seed) => earnsGiayKhen(step, seed))).toBe(false);
    }
  });
});

describe('carvings', () => {
  const carve = (seed: string, step: CommentStep | null, heavy = false) =>
    carvingFor({ taskId: seed, seed, comment: step, heavy, at: 0 });

  it('carves one of the six doodles, each of them in turn, for an everyday finish', () => {
    const kinds = new Set(seeds(600).map((seed) => carve(seed, 'good').kind));

    expect([...kinds].filter((kind) => DOODLES.includes(kind)).sort()).toEqual([...DOODLES].sort());
  });

  it('carves a 10 for a circled 10, and a gold star for about one other graded finish in thirty', () => {
    expect(carve('any', 'ten').kind).toBe('carved ten');
    const stars = seeds(6000).filter(
      (seed) => carve(seed, 'good work').kind === 'gold star',
    ).length;

    expect(stars).toBeGreaterThan(6000 / 30 / 1.4);
    expect(stars).toBeLessThan((6000 / 30) * 1.4);
  });

  it('leaves only a plain doodle for a serious or crisis task', () => {
    for (const seed of seeds(2000)) {
      expect(DOODLES).toContain(carve(seed, null, true).kind);
    }
  });

  it('places each mark by its seed, on the desk top', () => {
    const mark = carve('placed', 'fine');

    expect(carve('placed', 'fine')).toEqual(mark);
    expect(mark.x).toBeGreaterThanOrEqual(0);
    expect(mark.x).toBeLessThan(1);
    expect(mark.turn).toBeGreaterThanOrEqual(-30);
    expect(mark.turn).toBeLessThanOrEqual(30);
  });

  it('never loses a mark, and one task carves once', () => {
    const first = carve('one', 'fine');
    const second = carve('two', 'good');

    const desk = carveInto(carveInto(carveInto([], first), second), carve('one', 'ten'));

    expect(desk).toEqual([first, second]);
  });
});
