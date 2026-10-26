import { describe, expect, it } from 'vitest';

import { DAY_MS } from './moment';
import { hasHeavyToday, tuitionNoticeDue, type TuitionOfferInput } from './tuition-offer';
import { aTask, when } from './testing';

const now = when('2026-10-27', '10:00');

function due(over: Partial<TuitionOfferInput>): boolean {
  return tuitionNoticeDue({
    now,
    finishes: 3,
    atRecess: true,
    heavyToday: false,
    enrolled: false,
    lastPinnedAt: null,
    ...over,
  });
}

describe('the first tuition notice', () => {
  it('is pinned at the recess after the third finish, and not before', () => {
    expect(due({ finishes: 2 })).toBe(false);
    expect(due({ finishes: 3 })).toBe(true);
    expect(due({ finishes: 3, atRecess: false })).toBe(false);
  });

  it('is never pinned on a day with something heavy in it, or for someone already enrolled', () => {
    expect(due({ heavyToday: true })).toBe(false);
    expect(due({ enrolled: true })).toBe(false);
  });

  it('once left, is not pinned again for fourteen days', () => {
    expect(due({ finishes: 6, lastPinnedAt: now.at - 13 * DAY_MS })).toBe(false);
    expect(due({ finishes: 6, lastPinnedAt: now.at - 14 * DAY_MS })).toBe(true);
  });
});

describe('a heavy day', () => {
  it('has a serious or crisis task open, or one said, finished or erased today', () => {
    expect(hasHeavyToday([aTask(now, { daysOld: 5 })], now)).toBe(false);
    expect(hasHeavyToday([aTask(now, { daysOld: 5, care: 'serious' })], now)).toBe(true);
    expect(hasHeavyToday([aTask(now, { daysOld: 0, care: 'crisis', status: 'erased' })], now)).toBe(
      true,
    );
    expect(
      hasHeavyToday(
        [
          aTask(now, {
            daysOld: 5,
            care: 'serious',
            status: 'done',
            lastTouched: now.at - 3 * DAY_MS,
          }),
        ],
        now,
      ),
    ).toBe(false);
  });
});
