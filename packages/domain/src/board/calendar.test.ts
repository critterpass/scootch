import { describe, expect, it } from 'vitest';

import { TET, TRUNG_THU, classDay, tetDayOf } from './calendar';
import { daysBetween, weekdayOf } from './moment';

describe('the special days', () => {
  it.each([
    ['2026-11-20', 'teachers day'],
    ['2027-11-20', 'teachers day'],
    ['2026-09-05', 'khai giang'],
    ['2026-09-25', 'trung thu'],
    ['2026-09-18', 'trung thu'],
    ['2026-09-26', null],
    ['2028-10-03', 'trung thu'],
    ['2026-02-17', 'tet'],
    ['2026-02-10', 'tet'],
    ['2026-02-23', 'tet'],
    ['2026-02-24', null],
    ['2026-02-09', null],
    ['2033-01-31', 'tet'],
    ['2026-10-27', null],
  ])('%s is %s', (day, special) => {
    expect(classDay(day).special).toBe(special);
  });

  it('counts the days of Tết from mùng 1, across the turn of the year', () => {
    expect(tetDayOf('2026-02-17')).toBe(0);
    expect(tetDayOf('2026-02-16')).toBe(-1);
    // Tết 2031 falls on 23 January, so its run-up starts in the old year.
    expect(tetDayOf('2031-01-16')).toBe(-7);
    expect(tetDayOf('2031-01-29')).toBe(6);
    expect(tetDayOf('2040-02-12')).toBeNull();
  });

  it('keeps the lunar tables plausible: Tết in late January to February, Trung thu after it', () => {
    for (let year = 2026; year <= 2035; year += 1) {
      const tet = TET[year] ?? '';
      const trungThu = TRUNG_THU[year] ?? '';
      expect(tet >= `${year}-01-21` && tet <= `${year}-02-20`).toBe(true);
      // Seven lunar months and fourteen days, plus one leap month in some years.
      expect([220, 221, 250, 251]).toContain(daysBetween(tet, trungThu));
    }
    // Spot checks against published calendars.
    expect(weekdayOf(TET[2026] ?? '')).toBe(2);
    expect(weekdayOf(TRUNG_THU[2027] ?? '')).toBe(3);
  });

  it('puts his birthday where the install fixed it, behind every other special day', () => {
    expect(classDay('2026-03-14', { birthday: '03-14' }).special).toBe('his birthday');
    expect(classDay('2026-11-20', { birthday: '11-20' }).special).toBe('teachers day');
  });
});

describe('seasons and weather', () => {
  it('blooms the phượng in exam season, May and June', () => {
    expect(classDay('2026-05-01').examSeason).toBe(true);
    expect(classDay('2026-06-30').examSeason).toBe(true);
    expect(classDay('2026-07-01').examSeason).toBe(false);
  });

  it('rains through the monsoon months, May to October', () => {
    expect(classDay('2026-04-30').monsoon).toBe(false);
    expect(classDay('2026-08-10').monsoon).toBe(true);
    expect(classDay('2026-10-31').monsoon).toBe(true);
    expect(classDay('2026-11-01').monsoon).toBe(false);
  });

  it('is hot or cold by the temperature when it is known, else by the month', () => {
    expect(classDay('2026-06-10').heat).toBe('hot');
    expect(classDay('2026-01-10').heat).toBe('cold');
    expect(classDay('2026-10-10').heat).toBeNull();
    expect(classDay('2026-10-10', { celsius: 34 }).heat).toBe('hot');
    expect(classDay('2026-06-10', { celsius: 24 }).heat).toBeNull();
    expect(classDay('2026-06-10', { celsius: 12 }).heat).toBe('cold');
  });
});
