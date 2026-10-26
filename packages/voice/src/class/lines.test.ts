import { describe, expect, it } from 'vitest';

import { checkClassLine, maxLineLength, placeholdersIn, shortLineLength } from './check';
import { linePacks } from './choose';
import { fixedMoments, moments, silentMoments, type ClassLanguage, type Moment } from './types';

const languages: readonly ClassLanguage[] = ['en', 'vi'];

const every = languages.flatMap((language) =>
  moments.flatMap((moment) =>
    (linePacks[language][moment] as readonly string[]).map((line) => ({ language, moment, line })),
  ),
);

describe('his offline lines', () => {
  it.each(every)('$language $moment passes the check: "$line"', ({ language, line }) => {
    expect(checkClassLine(line, language).reasons).toEqual([]);
  });

  it.each(languages)('the %s pack holds exactly the moments, and no others', (language) => {
    expect(Object.keys(linePacks[language]).sort()).toEqual([...moments].sort());
  });

  it.each(moments)('%s uses the same placeholders in both languages', (moment) => {
    const used = (language: ClassLanguage) =>
      [
        ...new Set((linePacks[language][moment] as readonly string[]).flatMap(placeholdersIn)),
      ].sort();
    expect(used('vi')).toEqual(used('en'));
  });

  it.each(moments)('%s has at least three variants, unless it is fixed or silent', (moment) => {
    for (const language of languages) {
      const count = linePacks[language][moment].length;
      if (moment in silentMoments) expect(count).toBe(0);
      else if (moment in fixedMoments) expect(count).toBe(1);
      else expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(languages)('the %s pack repeats no line within a moment', (language) => {
    for (const moment of moments) {
      const lines = linePacks[language][moment] as readonly string[];
      expect(new Set(lines).size).toBe(lines.length);
    }
  });

  it.each(languages)('most %s lines are short, and none is long', (language) => {
    const lines = every.filter((entry) => entry.language === language).map((entry) => entry.line);
    expect(lines.every((line) => line.length <= maxLineLength)).toBe(true);
    const short = lines.filter((line) => line.length < shortLineLength).length;
    expect(short / lines.length).toBeGreaterThanOrEqual(0.9);
  });
});

describe('the lines the brief fixes', () => {
  const first = (language: ClassLanguage, moment: Moment) => linePacks[language][moment][0];

  it('keeps the drum the same in both languages', () => {
    expect(first('en', 'drumStart')).toBe('Tùng! Tùng! Tùng!');
    expect(first('vi', 'drumStart')).toBe('Tùng! Tùng! Tùng!');
    expect(first('en', 'timeUp')).toBe('Tùng tùng tùng. Done?');
    expect(first('vi', 'timeUp')?.startsWith('Tùng tùng tùng.')).toBe(true);
  });

  it('opens each pressure step with its line from the brief', () => {
    expect(first('en', 'pressure0')).toBe('Two minutes. I’ll wait.');
    expect(first('en', 'pressure1')).toBe('This tea was hot when you sat down.');
    expect(first('en', 'pressure2')).toBe('We both know how this ends.');
    expect(first('en', 'pressure3')).toBe('Tap. Tap.');
    expect(first('en', 'pressure5')).toBe('...');
    expect(first('vi', 'pressure5')).toBe('...');
  });

  it('shouts the full name at pressure 4 in every variant', () => {
    for (const language of languages) {
      for (const line of linePacks[language].pressure4)
        expect(line.startsWith('{NAME}.')).toBe(true);
    }
  });

  it('says only "Sit." to someone coming back', () => {
    expect(linePacks.en.comingBack).toEqual(['Sit.']);
    expect(linePacks.vi.comingBack).toEqual(['Ngồi.']);
  });

  it('opens the first day with the class and its one student', () => {
    expect(first('vi', 'firstDayClass')).toBe('Lớp 11A. Sĩ số: 1.');
    expect(first('en', 'firstDaySit')).toBe('Sit.');
  });

  it('writes the comment ladder and leaves the circled 10 without words', () => {
    expect([
      first('en', 'commentFine'),
      first('en', 'commentGood'),
      first('en', 'commentGoodWork'),
    ]).toEqual(['Fine.', 'Good.', 'Good work.']);
    expect(linePacks.en.commentTen).toEqual([]);
    expect(linePacks.vi.commentTen).toEqual([]);
  });

  it('says nothing when a task is erased, and nothing on the crisis screen', () => {
    for (const language of languages) {
      expect(linePacks[language].boardErase).toEqual([]);
      expect(linePacks[language].crisis).toEqual([]);
    }
  });

  it('accepts a real reason with one word, and keeps the front-row line', () => {
    expect(first('en', 'slipAccepted')).toBe('Accepted.');
    expect(first('en', 'frontRow')).toBe('Five slips. Front row tomorrow.');
  });

  it('keeps the plain lines plain: no task, name or joke before the screen', () => {
    for (const language of languages) {
      for (const moment of [
        'writtenDown',
        'shortTap',
        'seriousCompany',
        'crisisCompany',
      ] as const) {
        for (const line of linePacks[language][moment]) expect(placeholdersIn(line)).toEqual([]);
      }
    }
  });
});
