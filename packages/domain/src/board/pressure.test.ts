import { describe, expect, it } from 'vitest';

import { openDesk } from './actions';
import { MINUTE_MS } from './moment';
import { startPeriod } from './period';
import { FUSE_MS, fuseOf, isInsideFuse, nextPressureAt, pressureOf } from './pressure';
import { later, onDesk, when } from './testing';

const putThere = when('2026-10-27', '09:00');

describe('pressure on a waiting desk task', () => {
  it.each([
    [0, 0],
    [1.9, 0],
    [2, 1],
    [4.9, 1],
    [5, 2],
    [10, 3],
    [20, 4],
    [39, 4],
    [40, 5],
    [240, 5],
  ])('after %s minutes on the desk is step %s', (minutes, step) => {
    expect(pressureOf(onDesk(putThere), later(putThere, minutes))).toBe(step);
  });

  it('rises one step for every two tallies, and never past five', () => {
    const at = later(putThere, 5);

    expect(pressureOf(onDesk(putThere, { tallies: 1 }), at)).toBe(2);
    expect(pressureOf(onDesk(putThere, { tallies: 2 }), at)).toBe(3);
    expect(pressureOf(onDesk(putThere, { tallies: 4 }), putThere)).toBe(2);
    expect(pressureOf(onDesk(putThere, { tallies: 9 }), later(putThere, 30))).toBe(5);
  });

  it('does not count accepted reasons', () => {
    expect(pressureOf(onDesk(putThere, { accepted: 6 }), putThere)).toBe(0);
  });

  it('counts only from the start of today for a task put on the desk on an earlier day', () => {
    const yesterday = when('2026-10-26', '22:00');
    const task = onDesk(yesterday);

    expect(pressureOf(task, when('2026-10-27', '00:03'))).toBe(1);
    expect(pressureOf(task, when('2026-10-27', '00:01'))).toBe(0);
  });

  it('goes back to zero when the period starts', () => {
    const task = onDesk(putThere, { tallies: 4 });
    const atTwenty = later(putThere, 20);
    expect(pressureOf(task, atTwenty)).toBe(5);

    const started = startPeriod(task, atTwenty.at);

    expect(pressureOf(started, later(atTwenty, 30))).toBe(0);
    expect(fuseOf(started, atTwenty)).toBeNull();
  });

  it('is zero with no fuse on a serious or crisis task, however long and however slipped', () => {
    for (const care of ['serious', 'crisis'] as const) {
      const task = onDesk(putThere, { tallies: 8 }, care);
      expect(pressureOf(task, later(putThere, 120))).toBe(0);
      expect(fuseOf(task, putThere)).toBeNull();
      expect(nextPressureAt(task, putThere)).toBeNull();
      expect(isInsideFuse(task, putThere.at)).toBe(false);
    }
  });

  it('says when it next rises', () => {
    const task = onDesk(putThere);

    expect(nextPressureAt(task, later(putThere, 3))).toBe(putThere.at + 5 * MINUTE_MS);
    expect(nextPressureAt(task, later(putThere, 41))).toBeNull();
  });
});

describe('the fuse', () => {
  it('burns for two minutes from when the desk opened', () => {
    const task = onDesk(putThere);

    expect(fuseOf(task, putThere)).toEqual({ leftMs: FUSE_MS, burnt: 0 });
    expect(fuseOf(task, later(putThere, 1))).toEqual({ leftMs: FUSE_MS / 2, burnt: 0.5 });
    expect(fuseOf(task, later(putThere, 3))).toEqual({ leftMs: 0, burnt: 1 });
  });

  it('starts again when the desk is opened again, without lowering the pressure', () => {
    const task = onDesk(putThere);
    const back = later(putThere, 12);

    const reopened = openDesk(task, back.at);

    expect(fuseOf(reopened, back)).toEqual({ leftMs: FUSE_MS, burnt: 0 });
    expect(pressureOf(reopened, back)).toBe(3);
  });

  it('marks a start inside it, and keeps the first period’s mark for the next', () => {
    const task = onDesk(putThere);

    expect(startPeriod(task, later(putThere, 1.5).at).desk?.insideFuse).toBe(true);
    expect(startPeriod(task, later(putThere, 2.5).at).desk?.insideFuse).toBe(false);
  });
});
