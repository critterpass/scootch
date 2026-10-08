import { describe, expect, it } from 'vitest';

import { dialLink, isOpenAt, orderedAt, textLink, unverifiedHelplines } from './helpline-rules';
import { HELPLINES, HELPLINE_DIRECTORY, helplinesFor, type Helpline } from './helpline-table';
import { helplineDetail, hoursWords } from './helpline-words';

/** An instant written as the clock on a wall in Vietnam shows it. */
const inVietnam = (day: string, time: string) => Date.parse(`${day}T${time}:00+07:00`);
const MONDAY = '2026-10-05';
const TUESDAY = '2026-10-06';
const WEDNESDAY = '2026-10-07';
const SUNDAY = '2026-10-11';

const vietnam = helplinesFor('VN');
const lineNumbered = (number: string): Helpline => {
  const line = vietnam.find((one) => one.number === number);
  if (!line) throw new Error(`no Vietnamese line ${number}`);
  return line;
};
const ngayMai = lineNumbered('096 306 1414');
const hope = lineNumbered('086 50 444 00');
const numbersAt = (now: number) => orderedAt(vietnam, now).map((one) => one.line.number);

describe('whether a line is open', () => {
  it('opens on the opening minute and closes on the closing minute', () => {
    expect(isOpenAt(ngayMai, inVietnam(WEDNESDAY, '12:59'))).toBe(false);
    expect(isOpenAt(ngayMai, inVietnam(WEDNESDAY, '13:00'))).toBe(true);
    expect(isOpenAt(ngayMai, inVietnam(WEDNESDAY, '20:29'))).toBe(true);
    expect(isOpenAt(ngayMai, inVietnam(WEDNESDAY, '20:30'))).toBe(false);

    expect(isOpenAt(hope, inVietnam(MONDAY, '16:29'))).toBe(false);
    expect(isOpenAt(hope, inVietnam(MONDAY, '16:30'))).toBe(true);
    expect(isOpenAt(hope, inVietnam(MONDAY, '20:29'))).toBe(true);
    expect(isOpenAt(hope, inVietnam(MONDAY, '20:30'))).toBe(false);
  });

  it('stays closed all day on a day the line does not answer', () => {
    for (const day of [MONDAY, TUESDAY]) {
      for (const time of ['00:00', '12:59', '13:00', '17:00', '20:29', '23:59']) {
        expect(isOpenAt(ngayMai, inVietnam(day, time))).toBe(false);
      }
    }
    expect(isOpenAt(ngayMai, inVietnam(SUNDAY, '17:00'))).toBe(true);
  });

  it('reads the hours in Vietnam time, whatever the day and hour are where the phone is', () => {
    // Tuesday 23:30 in Los Angeles is Wednesday 13:30 in Vietnam: open.
    expect(isOpenAt(ngayMai, Date.parse('2026-10-06T23:30:00-07:00'))).toBe(true);
    // Wednesday 17:00 in Los Angeles is Thursday 07:00 in Vietnam: closed.
    expect(isOpenAt(ngayMai, Date.parse('2026-10-07T17:00:00-07:00'))).toBe(false);
    // Sunday 23:00 in Auckland (UTC+13) is Sunday 17:00 in Vietnam: open.
    expect(isOpenAt(ngayMai, Date.parse('2026-10-11T23:00:00+13:00'))).toBe(true);
    // Monday 03:00 in Auckland is still Sunday 21:00 in Vietnam: closed.
    expect(isOpenAt(ngayMai, Date.parse('2026-10-12T03:00:00+13:00'))).toBe(false);
  });

  it('is always open for a line that never closes', () => {
    for (const line of HELPLINES.filter((one) => one.hours.kind === 'always')) {
      expect(isOpenAt(line, inVietnam(MONDAY, '03:00'))).toBe(true);
    }
  });
});

describe('the order Vietnam is shown in', () => {
  it('is emergency first and then the table, when every line is open', () => {
    expect(numbersAt(inVietnam(WEDNESDAY, '17:00'))).toEqual([
      '115',
      '096 306 1414',
      '086 50 444 00',
      '111',
    ]);
  });

  it('puts the closed lines last when only the emergency and the child line are open', () => {
    expect(numbersAt(inVietnam(WEDNESDAY, '09:00'))).toEqual([
      '115',
      '111',
      '096 306 1414',
      '086 50 444 00',
    ]);
  });

  it('follows the clock through a Monday afternoon', () => {
    // 14:00: Ngày mai does not answer on Mondays, and HOPE has not opened yet.
    expect(numbersAt(inVietnam(MONDAY, '14:00'))).toEqual([
      '115',
      '111',
      '096 306 1414',
      '086 50 444 00',
    ]);
    // 17:00: HOPE has opened.
    expect(numbersAt(inVietnam(MONDAY, '17:00'))).toEqual([
      '115',
      '086 50 444 00',
      '111',
      '096 306 1414',
    ]);
  });

  it('never leaves a line out, and says which ones are closed', () => {
    const shown = orderedAt(vietnam, inVietnam(MONDAY, '14:00'));
    expect(shown).toHaveLength(vietnam.length);
    expect(shown.filter((one) => !one.open).map((one) => one.line.number)).toEqual([
      '096 306 1414',
      '086 50 444 00',
    ]);
  });
});

describe('the helpline table', () => {
  it('gives an unknown region no number, so the directory is what is shown', () => {
    expect(helplinesFor('ZZ')).toEqual([]);
    expect(helplinesFor(null)).toEqual([]);
    expect(helplinesFor('')).toEqual([]);
    expect(HELPLINE_DIRECTORY).toMatch(/^https:\/\//);
  });

  it('finds a region however the phone writes its code', () => {
    expect(helplinesFor('us').map((line) => line.number)).toEqual(['988']);
    expect(helplinesFor('IE')).toEqual(helplinesFor('GB'));
  });

  it('builds every call and text link from the digits of its row and nothing else', () => {
    for (const line of HELPLINES) {
      expect(line.number).toMatch(/^\d[\d ]*$/);
      expect(dialLink(line)).toBe(`tel:${line.number.split(' ').join('')}`);
      expect(dialLink(line)).toMatch(/^tel:\d+$/);
      const text = textLink(line);
      if (line.textNumber === undefined) expect(text).toBeNull();
      else expect(text).toBe(`sms:${line.textNumber.split(' ').join('')}`);
    }
    expect(textLink(helplinesFor('AU')[0] ?? {})).toBe('sms:0477131114');
    expect(dialLink({ number: '+1 (800) 555-0100;ext=9?x' })).toBe('tel:180055501009');
    expect(textLink({ textNumber: '0477 13&body=x' })).toBe('sms:047713');
  });

  it('writes weekly hours that open before they close, on at least one day', () => {
    for (const { hours } of HELPLINES) {
      if (hours.kind !== 'weekly') continue;
      expect(hours.from).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(hours.to).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(hours.from < hours.to).toBe(true);
      expect(hours.days.length).toBeGreaterThan(0);
    }
  });

  it('marks the one line that is not for everyone', () => {
    expect(HELPLINES.filter((line) => line.audience).map((line) => line.number)).toEqual(['111']);
  });
});

describe('the release check', () => {
  const verified: Helpline = { ...ngayMai, checkedOn: '2026-10-07' };

  it('passes a table in which every number and every hour has been checked', () => {
    expect(unverifiedHelplines([verified, lineNumbered('111')])).toEqual([]);
  });

  it('names a row whose number nobody has checked', () => {
    expect(unverifiedHelplines([verified, { ...verified, checkedOn: null }])).toHaveLength(1);
  });

  it('names a row whose hours nobody has checked, though its number has been', () => {
    if (verified.hours.kind !== 'weekly') throw new Error('Ngày mai has weekly hours');
    const hoursUnchecked: Helpline = { ...verified, hours: { ...verified.hours, checkedOn: null } };
    expect(unverifiedHelplines([hoursUnchecked])).toHaveLength(1);
  });

  it('finds nothing left to verify in the table the app and the site read', () => {
    expect(unverifiedHelplines(HELPLINES)).toEqual([]);
  });
});

describe('the words for a line’s hours', () => {
  it('names a run of days by its ends and writes the times as each language does', () => {
    expect(hoursWords('en', ngayMai.hours)).toContain('Wed to Sun, 1 pm to 8:30 pm');
    expect(hoursWords('vi', ngayMai.hours)).toContain('Thứ 4 đến Chủ nhật, 13:00–20:30');
    expect(hoursWords('en', hope.hours)).toContain('4:30 pm to 8:30 pm');
  });

  it('keeps the hours on a closed line and says more than an open one does', () => {
    for (const language of ['en', 'vi'] as const) {
      const hours = hoursWords(language, ngayMai.hours);
      expect(helplineDetail(language, ngayMai, true)).toBe(hours);
      const closed = helplineDetail(language, ngayMai, false);
      expect(closed).toContain(hours);
      expect(closed).not.toBe(hours);
    }
  });
});
