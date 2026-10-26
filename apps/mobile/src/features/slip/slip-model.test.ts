import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import { afterSlip, gradeExcuse } from './slip-model';

describe('grading an excuse', () => {
  it('accepts a real reason with one word and no grade', () => {
    expect(gradeExcuse('en', { kind: 'picked', which: 'real reason' }, 's')).toEqual({
      comment: 'Accepted.',
      grade: null,
      accepted: true,
    });
  });

  it('grades a printed excuse in red, in either language', () => {
    expect(gradeExcuse('en', { kind: 'picked', which: 'too tired' }, 's')).toMatchObject({
      grade: 'D',
      accepted: false,
    });
    expect(gradeExcuse('vi', { kind: 'picked', which: 'after lunch' }, 's')?.comment).toBeTruthy();
  });

  it('grades the user’s own words the same way every time, and ignores an empty slip', () => {
    const once = gradeExcuse('en', { kind: 'written', words: 'The cat sat on my laptop' }, 's');
    const again = gradeExcuse('en', { kind: 'written', words: 'The cat sat on my laptop' }, 's');
    expect(once).toEqual(again);
    expect(once?.grade).toMatch(/^[BCD]-?$/);
    expect(gradeExcuse('en', { kind: 'written', words: '   ' }, 's')).toBeNull();
  });
});

describe('handing in slips', () => {
  it('adds tallies, not for a real reason, and the fifth earns the front row line', async () => {
    let at = Date.parse('2026-10-27T09:00:00Z');
    let id = 0;
    const store = createBoardStore({
      db: await openMigratedDatabase(),
      clock: () => momentAt(at, 'UTC', 4),
      newId: () => `id-${(id += 1)}`,
    });
    await store.load();
    await store.say('Email the dentist');
    const outcomes = [];
    for (const accepted of [false, true, false, false, false, false]) {
      outcomes.push(await store.slip('Too tired', accepted));
      at += MINUTE_MS;
      // The only task on the board: his next pick brings it back to the desk.
      await store.pick();
    }
    expect(outcomes).toEqual(['graded', 'accepted', 'graded', 'graded', 'graded', 'front row']);
    expect(afterSlip('en', 'front row')).toBe('Five slips. Front row tomorrow.');
    expect(afterSlip('en', 'graded')).toBeNull();
  });
});
