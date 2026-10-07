import { describe, expect, it } from '@jest/globals';

import { JOKES, PLAIN, monsterRow, taskRow } from '../features/surfaces/test/rows';

import { bitesOf, bitten } from './bites';

const bites = [
  { text: "Find the dentist's email.", minutes: 1 },
  { text: 'Write two lines.', minutes: 4 },
  { text: 'Hit send.', minutes: 1 },
];
const lines = { ...JOKES, bites };

describe("a task's bites", () => {
  it('are the three its pack was written with', () => {
    expect(bitesOf(taskRow({ lines }))).toEqual(bites);
  });

  it('are none before the pack has them', () => {
    expect(bitesOf(taskRow())).toEqual([]);
    expect(bitesOf(taskRow({ lines: null, screen: 'unscreened' }))).toEqual([]);
  });

  it('are none for a serious task, even after "it is fine, be funny"', () => {
    expect(bitesOf(taskRow({ screen: 'serious', lines: PLAIN }))).toEqual([]);
    expect(bitesOf(taskRow({ screen: 'serious', seriousOverridden: true, lines }))).toEqual([]);
  });
});

describe('ticking a bite', () => {
  it('keeps the tick with the task and takes a third off the monster', () => {
    const after = bitten(taskRow({ lines }), monsterRow(), 1);
    expect(after?.task.bitesCaught).toEqual([1]);
    expect(after?.last).toBe(false);
    expect(after?.monster?.spec.size).toBeCloseTo(monsterRow().spec.size * (2 / 3));
  });

  it('says when the last one went, and leaves a crumb', () => {
    const task = taskRow({ lines, bitesCaught: [0, 2] });
    const monster = monsterRow();
    const small = { ...monster, spec: { ...monster.spec, size: 0.3 } };
    const after = bitten(task, small, 1);
    expect(after).toMatchObject({ last: true, task: { bitesCaught: [0, 1, 2] } });
    expect(after?.monster?.spec.size).toBe(0.25);
  });

  it('changes nothing but the ticks: no finish, no card, no smaller wording', () => {
    const task = taskRow({ lines });
    const after = bitten(task, monsterRow(), 0);
    expect(after?.task).toEqual({ ...task, bitesCaught: [0] });
    expect(after?.monster).toMatchObject({ caughtAt: null, number: null, rarity: null });
  });

  it('has nothing to tick twice, past the third, with no bites, or on a finished task', () => {
    expect(bitten(taskRow({ lines, bitesCaught: [1] }), monsterRow(), 1)).toBeNull();
    expect(bitten(taskRow({ lines }), monsterRow(), 3)).toBeNull();
    expect(bitten(taskRow(), monsterRow(), 0)).toBeNull();
    expect(bitten(taskRow({ lines, status: 'finished' }), monsterRow(), 0)).toBeNull();
  });

  it('still keeps the tick when the monster could not be found', () => {
    expect(bitten(taskRow({ lines }), null, 0)).toMatchObject({ monster: null, last: false });
  });
});
