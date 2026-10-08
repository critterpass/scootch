import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addDays } from '../day';

import * as entries from './odd/index.generated';
import {
  ODD_CATCHES,
  ODD_HATCHES,
  isOddWeek,
  oddCatchFor,
  oddCatchesJoined,
  oddHatchFor,
  type OddHatchDraw,
  type OddHistoryMonster,
} from './odd-weeks';

/** A Monday. */
const START = '2026-01-05';
const weekAt = (index: number) => addDays(START, index * 7);
const weeks = Array.from({ length: 600 }, (_, index) => weekAt(index));

function caught(taskId: string, number: number, caughtOn: string): OddHistoryMonster {
  return { taskId, hatchedAt: `${caughtOn}T12:00:00.000Z`, caughtOn, number };
}

/** Three catches long ago, the first of them `seed`: enough for a week to be odd. */
function binder(seed: string): OddHistoryMonster[] {
  return [
    caught(seed, 1, '2025-06-02'),
    caught(`${seed}-two`, 2, '2025-06-03'),
    caught(`${seed}-three`, 3, '2025-06-04'),
  ];
}

/** The first odd week for a seed from `from` on, and the first ordinary one. */
const oddWeek = (seed: string, from = 0) =>
  weeks.slice(from).find((week) => isOddWeek(seed, week))!;
const plainWeek = (seed: string) => weeks.find((week) => !isOddWeek(seed, week))!;

function draw(over: Partial<OddHatchDraw> = {}): OddHatchDraw {
  return {
    taskId: 'task-now',
    serious: false,
    today: oddWeek('first'),
    monsters: binder('first'),
    timeZone: 'UTC',
    ...over,
  };
}

describe('which weeks are odd', () => {
  it('is the same for the same seed, on every day of the week', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 0, max: 599 }), (seed, index) => {
        const monday = weekAt(index);
        const answer = isOddWeek(seed, monday);
        for (let day = 0; day < 7; day += 1)
          expect(isOddWeek(seed, addDays(monday, day))).toBe(answer);
      }),
    );
  });

  it('never has two odd weeks running', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (seed) => {
        for (let index = 1; index < weeks.length; index += 1) {
          expect(isOddWeek(seed, weekAt(index)) && isOddWeek(seed, weekAt(index - 1))).toBe(false);
        }
      }),
      { numRuns: 40 },
    );
  });

  it('is about one week in six', () => {
    let odd = 0;
    const seeds = Array.from({ length: 20 }, (_, index) => `seed-${index}`);
    for (const seed of seeds) odd += weeks.filter((week) => isOddWeek(seed, week)).length;
    const share = odd / (seeds.length * weeks.length);
    expect(share).toBeGreaterThan(1 / 7);
    expect(share).toBeLessThan(1 / 5);
  });

  it('differs from one user to the next', () => {
    const pattern = (seed: string) => weeks.map((week) => isOddWeek(seed, week)).join();
    expect(pattern('first')).not.toBe(pattern('second'));
  });
});

describe('the odd hatch and the odd catch', () => {
  it('give the same answer for the same history, in whatever order it is read back', () => {
    const today = oddWeek('first');
    const monsters = [...binder('first'), caught('later', 4, addDays(today, -70))];
    const again = JSON.parse(JSON.stringify([...monsters].reverse())) as OddHistoryMonster[];
    for (const day of weeks.slice(0, 120)) {
      expect(oddHatchFor(draw({ today: day, monsters: again }))).toEqual(
        oddHatchFor(draw({ today: day, monsters })),
      );
      expect(oddCatchFor(draw({ today: day, monsters: again }))).toEqual(
        oddCatchFor(draw({ today: day, monsters })),
      );
    }
    expect(oddCatchesJoined({ taskId: 'task-now', monsters: again })).toEqual(
      oddCatchesJoined({ taskId: 'task-now', monsters }),
    );
  });

  it('turn up in an odd week and in no other', () => {
    expect(oddHatchFor(draw())).toEqual({ on: 'hatch', word: 'tiny' });
    expect(oddCatchFor(draw())).toEqual({ on: 'catch', kind: 'teacup' });
    expect(oddHatchFor(draw({ today: plainWeek('first') }))).toBeNull();
    expect(oddCatchFor(draw({ today: plainWeek('first') }))).toBeNull();
  });

  it('never turn up in the first three catches', () => {
    for (const today of weeks) {
      for (let had = 0; had < 3; had += 1) {
        const monsters = binder('first').slice(0, had);
        expect(oddHatchFor(draw({ today, monsters }))).toBeNull();
        expect(oddCatchFor(draw({ today, monsters }))).toBeNull();
      }
    }
    // The task in hand does not count towards its own three.
    const own = [...binder('first').slice(0, 2), caught('task-now', 3, oddWeek('first'))];
    expect(oddCatchFor(draw({ monsters: own }))).toBeNull();
  });

  it('never vary a serious task', () => {
    for (const today of weeks) {
      expect(oddHatchFor(draw({ today, serious: true }))).toBeNull();
      expect(oddCatchFor(draw({ today, serious: true }))).toBeNull();
    }
  });

  it('happen at most once each in the week', () => {
    const today = oddWeek('first');
    const tiny: OddHistoryMonster = {
      taskId: 'tiny-one',
      hatchedAt: `${today}T12:00:00.000Z`,
      caughtOn: null,
      number: null,
      oddWord: 'tiny',
    };
    // A monster already hatched tiny this week: the next hatch is an ordinary one.
    expect(
      oddHatchFor(draw({ today: addDays(today, 3), monsters: [...binder('first'), tiny] })),
    ).toBeNull();
    // An ordinary hatch this week takes nothing: the word is still to come.
    const plain = { ...tiny, oddWord: null };
    expect(oddHatchFor(draw({ today, monsters: [...binder('first'), plain] }))).not.toBeNull();
    // Its own row, read again, does not take its own turn.
    expect(
      oddHatchFor(draw({ taskId: 'tiny-one', today, monsters: [...binder('first'), tiny] })),
    ).not.toBeNull();

    // A week is the user's own: one hatched in the small hours of their Monday is this week's.
    const small = { ...tiny, hatchedAt: `${addDays(today, -1)}T18:30:00.000Z` };
    const here = draw({ today, monsters: [...binder('first'), small], timeZone: 'Asia/Saigon' });
    expect(oddHatchFor(here)).toBeNull();
    expect(oddHatchFor({ ...here, timeZone: 'UTC' })).not.toBeNull();

    // The week's first catch was the odd one: the next task rolls as usual.
    const after = [...binder('first'), caught('cupped', 4, today)];
    expect(oddCatchFor(draw({ today: addDays(today, 2), monsters: after }))).toBeNull();
    // The cupped task itself still shows its cup once it is caught.
    expect(oddCatchFor(draw({ taskId: 'cupped', today, monsters: after }))).not.toBeNull();
  });
});

describe('an odd catch joining the usual roll', () => {
  const first = oddWeek('first');

  it('has not joined before its first turn', () => {
    expect(oddCatchesJoined({ taskId: 'task-now', monsters: [] })).toEqual([]);
    expect(oddCatchesJoined({ taskId: 'task-now', monsters: binder('first') })).toEqual([]);
    // Catches in ordinary weeks bring nothing in.
    const ordinary = [...binder('first'), caught('four', 4, plainWeek('first'))];
    expect(oddCatchesJoined({ taskId: 'task-now', monsters: ordinary })).toEqual([]);
    // While the task in hand is the one under the cup, the cup is still on its first turn.
    const cupped = [...binder('first'), caught('cupped', 4, first)];
    expect(oddCatchesJoined({ taskId: 'cupped', monsters: cupped })).toEqual([]);
  });

  it('has joined once it was the first catch of an odd week', () => {
    const cupped = [...binder('first'), caught('cupped', 4, first)];
    expect(oddCatchesJoined({ taskId: 'task-now', monsters: cupped })).toEqual(['teacup']);
  });

  it('is not brought in by an odd week that fell inside the first three catches', () => {
    const early = [
      caught('first', 1, addDays(first, -7)),
      caught('second', 2, first),
      caught('third', 3, addDays(first, 1)),
      caught('fourth', 4, addDays(first, 2)),
    ];
    expect(oddCatchesJoined({ taskId: 'task-now', monsters: early })).toEqual([]);
  });
});

describe('the folder of odd variations', () => {
  it('holds nothing but variations, and every one is collected', () => {
    expect(ODD_HATCHES.length + ODD_CATCHES.length).toBe(Object.keys(entries).length);
    expect(ODD_HATCHES.map((one) => one.word)).toEqual(['tiny']);
    expect(ODD_CATCHES.map((one) => one.kind)).toEqual(['teacup']);
  });
});
