import { describe, expect, it } from 'vitest';

import { resolveHeardDate } from '../src/ai/task-create/deadlines';

// 6 October 2026 is a Tuesday.
const localDate = '2026-10-06';

function heard(heardAs: string, candidate = '', text = `I need to sort it ${heardAs} ok`) {
  return resolveHeardDate({ heardAs, candidate, text, localDate });
}

describe('resolveHeardDate', () => {
  it.each([
    ['due on Friday', '2026-10-09'],
    ['by tomorrow morning', '2026-10-07'],
    ['tonight', '2026-10-06'],
    ['in 3 days', '2026-10-09'],
    ['in two weeks', '2026-10-20'],
    ['by the 15th', '2026-10-15'],
    ['on the 2nd', '2026-11-02'],
    ['October 20', '2026-10-20'],
    ['by 3 January', '2027-01-03'],
    ['before the end of the month', '2026-10-31'],
    ['trước thứ sáu', '2026-10-09'],
    ['truoc thu sau', '2026-10-09'],
    ['thứ hai tuần sau', '2026-10-12'],
    ['chủ nhật tuần sau', '2026-10-18'],
    ['sáng mai', '2026-10-07'],
    ['hôm nay', '2026-10-06'],
    ['ba ngày nữa', '2026-10-09'],
    ['trước ngày 20', '2026-10-20'],
    ['ngày 5 tháng 11', '2026-11-05'],
    ['hạn 15/10', '2026-10-15'],
    ['cuối tháng', '2026-10-31'],
  ])('works out "%s" in code, whatever the model offered', (heardAs, expected) => {
    expect(heard(heardAs, '2031-01-01')).toBe(expected);
    expect(heard(heardAs)).toBe(expected);
  });

  it("keeps the model's reading only where the phrase allows two days", () => {
    expect(heard('next Friday', '2026-10-16')).toBe('2026-10-16');
    expect(heard('next Friday', '2026-10-09')).toBe('2026-10-09');
    expect(heard('next Friday', '2026-10-23')).toBeNull();
    expect(heard('by 3/4', '2027-04-03')).toBe('2027-04-03');
    expect(heard('by 3/4', '2027-03-04')).toBe('2027-03-04');
    expect(heard('by 3/4', '2026-12-25')).toBeNull();
  });

  it.each([
    ['a phrase that is not in the text', 'due on Friday', '2026-10-09', 'call the plumber'],
    ['a phrase with no date in it', 'soon', '2026-10-09', undefined],
    ['a vague week', 'sometime next week', '2026-10-13', undefined],
    ['a time of day alone', 'at 5pm', '2026-10-06', undefined],
    ['a month with no day', 'in October', '2026-10-31', undefined],
    ['a day that does not exist', 'ngày 31 tháng 11', '2026-11-31', undefined],
    ['an empty phrase', '', '2026-10-09', undefined],
    ['a date more than a year away', '5/10/2028', '2028-10-05', undefined],
    ['a date already gone', '1/10/2026', '2026-10-01', undefined],
  ])('gives no date for %s', (_, heardAs, candidate, text) => {
    expect(heard(heardAs, candidate, text)).toBeNull();
  });

  it('gives no date when today itself is not a real day', () => {
    expect(
      resolveHeardDate({
        heardAs: 'friday',
        candidate: '',
        text: 'friday',
        localDate: '2026-13-40',
      }),
    ).toBeNull();
  });
});
