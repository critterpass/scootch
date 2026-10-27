import { describe, expect, it } from 'vitest';

import { findTimeToday, namesAnotherDay, resolveHeardTime } from './heard-times';

/** Minutes since midnight for a clock time. */
function at(clock: string): number {
  const [hour = 0, minute = 0] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function heard(heardAs: string, now = '11:00', text = `so today ${heardAs} ok`) {
  return resolveHeardTime({ heardAs, text, nowMinutes: at(now) });
}

describe('resolveHeardTime', () => {
  it.each([
    ['at three', '15:00'],
    ['at 3', '15:00'],
    ['at 3pm', '15:00'],
    ['at 3:30', '15:30'],
    ['at half two', '14:30'],
    ['at half past 4', '16:30'],
    ['quarter to five', '16:45'],
    ['at 15:00', '15:00'],
    ['at noon', '12:00'],
    ['at eleven thirty', '11:30'],
    ['at 9 tonight', '21:00'],
    ["3 o'clock", '15:00'],
    ['by five this afternoon', '17:00'],
    ['ba giờ rưỡi', '15:30'],
    ['mười một giờ đêm', '23:00'],
    ['3g chiều', '15:00'],
    ['lúc 3 giờ chiều', '15:00'],
    ['3h', '15:00'],
    ['15h30', '15:30'],
    ['ba rưỡi chiều', '15:30'],
    ['3 giờ kém 15', '14:45'],
    ['luc 3 gio chieu', '15:00'],
    ['12 giờ trưa', '12:00'],
    ['1 giờ trưa', '13:00'],
    ['8 giờ tối', '20:00'],
    ['lúc 3', '15:00'],
  ])('works out "%s", said at eleven in the morning', (heardAs, expected) => {
    expect(heard(heardAs)).toBe(expected);
  });

  it('reads an hour said without its half of the day as the next one still ahead today', () => {
    expect(heard('at 10', '08:00')).toBe('10:00');
    expect(heard('at 10', '11:00')).toBe('22:00');
    expect(heard('at 7', '06:00')).toBe('07:00');
    expect(heard('at 7', '07:00')).toBe('19:00');
    expect(heard('9h sáng', '08:00')).toBe('09:00');
    // After midnight the day has not turned yet, and both its nine o'clocks are behind it.
    expect(heard('at 9', '01:30')).toBeNull();
    expect(heard('at 2am', '01:30')).toBe('02:00');
  });

  it.each([
    ['an hour whose both halves have gone by', 'at 3', '16:00', undefined],
    ['a bare hour that could only be the small hours', 'at 2', '23:00', undefined],
    ['a time that has gone by', 'at 3pm', '16:00', undefined],
    ['a morning that has gone by', '9h sáng', '11:00', undefined],
    ['a phrase that is not in the text', 'at 3', '11:00', 'call the plumber'],
    ['a phrase with no time in it', 'soon', '11:00', undefined],
    ['a length, not a time', 'for 3 hours', '11:00', undefined],
    ['an hour that does not exist', 'at 25', '11:00', undefined],
    ['an empty phrase', '', '11:00', undefined],
  ])('gives no time for %s', (_, heardAs, now, text) => {
    expect(heard(heardAs, now, text)).toBeNull();
  });
});

describe('a time said with a day', () => {
  // 8 October 2026 is a Thursday.
  const today = '2026-10-08';

  it.each([
    'dentist at 3 on Friday and then lunch',
    'tomorrow I have the dentist at 3',
    'khám răng lúc 3 giờ chiều mai',
    'thứ sáu khám răng lúc 3 giờ',
    'dentist at 3 on 12/10',
  ])('is another day in "%s"', (text) => {
    const heardAs = text.includes('giờ') ? 'lúc 3 giờ' : 'at 3';
    expect(namesAnotherDay(heardAs, text, today)).toBe(true);
  });

  it.each([
    'dentist at 3, and the report is due on Friday',
    'I have the dentist at 3 and the report is due Friday',
    'dentist at 3 this afternoon',
    'Thursday at 3 I have the dentist',
    'chiều nay khám răng lúc 3 giờ, thứ sáu nộp báo cáo',
  ])('is today in "%s"', (text) => {
    const heardAs = text.includes('giờ') ? 'lúc 3 giờ' : 'at 3';
    expect(namesAnotherDay(heardAs, text, today)).toBe(false);
  });
});

// 27 October 2026 is a Tuesday; it is eleven in the morning.
const clock = { today: '2026-10-27', nowMinutes: at('11:00') };

describe('finding a time today in English', () => {
  it.each([
    ['dentist at three', '15:00', 'at three'],
    ['call the bank at 3pm', '15:00', 'at 3pm'],
    ['team meeting at 4:30', '16:30', 'at 4:30'],
    ['pick up the kids at half past five', '17:30', 'at half past five'],
    ['leave at quarter to six', '17:45', 'at quarter to six'],
    ['dinner with Sam tonight at 8', '20:00', 'tonight at 8'],
    ['gym at noon', '12:00', 'at noon'],
    ['submit it by 5 pm today', '17:00', 'by 5 pm'],
    ['yoga at 6 this evening', '18:00', 'at 6 this evening'],
    ["parents' evening at 7 o'clock", '19:00', "at 7 o'clock"],
    ['haircut around 2', '14:00', 'around 2'],
  ])('"%s" is at %s', (text, time, heardAs) => {
    expect(findTimeToday(text, clock)).toMatchObject({ at: time, heardAs });
  });

  it.each([
    ['a time on another day', 'dentist at 3 on Friday'],
    ['a time tomorrow', 'dentist tomorrow at 3'],
    ['a length of time', 'run for 3 hours'],
    ['a count', 'about 3 things to sort'],
    ['a time that has gone by', 'breakfast meeting at 9am'],
    ['a date', 'pay the fine by 3/11'],
  ])('finds none in %s', (_, text) => {
    expect(findTimeToday(text, clock)).toBeNull();
  });
});

describe('finding a time today in Vietnamese', () => {
  it.each([
    ['khám răng lúc 3 giờ chiều', '15:00', 'lúc 3 giờ chiều'],
    ['3h chiều họp', '15:00', '3h chiều'],
    ['lúc 15h30 gọi điện cho sếp', '15:30', 'lúc 15h30'],
    ['đón con lúc 5 giờ rưỡi', '17:30', 'lúc 5 giờ rưỡi'],
    ['chiều nay lúc 4 giờ đi ngân hàng', '16:00', 'chiều nay lúc 4 giờ'],
    ['8 giờ tối học tiếng Anh', '20:00', '8 giờ tối'],
    ['4 giờ kém 15 đi đón con', '15:45', '4 giờ kém 15'],
    ['ba rưỡi chiều gặp khách', '15:30', 'ba rưỡi chiều'],
    ['họp lúc 2 giờ', '14:00', 'lúc 2 giờ'],
    ['kham rang luc 3 gio chieu', '15:00', 'luc 3 gio chieu'],
  ])('"%s" is at %s', (text, time, heardAs) => {
    expect(findTimeToday(text, clock)).toMatchObject({ at: time, heardAs });
  });

  it.each([
    ['a length of time', 'trong 2 giờ làm xong bài'],
    ['a time tomorrow', 'mai 3 giờ chiều khám răng'],
    ['a time on another day', 'thứ sáu họp lúc 9 giờ'],
    ['a morning gone by', 'họp lúc 9 giờ sáng'],
    ['a word that holds a number', 'nộp báo cáo tài chính quý ba'],
    ['a word that holds a number, typed without marks', 'nop bao cao tai chinh quy ba'],
  ])('finds none in %s', (_, text) => {
    expect(findTimeToday(text, clock)).toBeNull();
  });
});
