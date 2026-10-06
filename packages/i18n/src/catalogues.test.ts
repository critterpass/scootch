import { describe, expect, it } from 'vitest';
import { findCatalogueProblems } from './completeness';
import { en } from './en';
import { pickLanguage } from './pick-language';
import { t } from './translate';
import { vi } from './vi';

describe('catalogue completeness', () => {
  it('has every English string in Vietnamese, with the same parameters and a real translation', () => {
    expect(findCatalogueProblems(en, vi)).toEqual([]);
  });

  it('names a key that exists in one language only', () => {
    const problems = findCatalogueProblems({ a: 'Start', b: 'Done' }, { a: 'Bắt đầu', c: 'Xong' });
    expect(problems).toEqual(['c: only in the translation', 'b: missing from the translation']);
  });

  it('names a key whose parameter names differ', () => {
    const problems = findCatalogueProblems({ hi: 'Hi {name}' }, { hi: 'Chào {ten}' });
    expect(problems).toEqual(['hi: parameters differ ({name} against {ten})']);
  });

  it('names a key that is plural in one language only', () => {
    const source = { n: { one: '{count} thing', other: '{count} things' } };
    expect(findCatalogueProblems(source, { n: '{count} thứ' })).toEqual([
      'n: plural in one language only',
    ]);
  });

  it('names an empty or untranslated value, except for the allowed shared words', () => {
    const source = { a: 'Start', b: 'Settings', brand: 'Scootch', n: { other: '{count} left' } };
    const translation = { a: ' ', b: 'Settings', brand: 'Scootch', n: { other: '{count} left' } };
    expect(findCatalogueProblems(source, translation)).toEqual([
      'a: empty translation',
      'b: identical to the source ("Settings")',
      'n: identical to the source ("{count} left")',
    ]);
  });
});

describe('t', () => {
  it('returns the string in the asked language', () => {
    expect(t('en', 'talk.hold')).toBe('Hold to talk');
    expect(t('vi', 'talk.hold')).toBe('Giữ để nói');
  });

  it('picks the English plural form from the count and fills it in', () => {
    expect(t('en', 'world.thingsLiveHere', { count: 1 })).toBe('1 thing lives here');
    expect(t('en', 'world.thingsLiveHere', { count: 7 })).toBe('7 things live here');
    expect(t('en', 'world.thingsLiveHere', { count: 0 })).toBe('0 things live here');
  });

  it('uses the single Vietnamese form for every count', () => {
    expect(t('vi', 'world.thingsLiveHere', { count: 1 })).toBe('1 thứ đang sống ở đây');
    expect(t('vi', 'world.thingsLiveHere', { count: 7 })).toBe('7 thứ đang sống ở đây');
  });
});

/** Never called: the typecheck fails if any of these calls stops being an error. */
export function callsTheCompilerRejects(): void {
  // @ts-expect-error not a key of the English catalogue
  t('en', 'talk.missing');
  // @ts-expect-error a plural needs its count
  t('en', 'world.thingsLiveHere');
  // @ts-expect-error the count is a number
  t('en', 'world.thingsLiveHere', { count: '7' });
  // @ts-expect-error a string without placeholders takes no parameters
  t('en', 'talk.hold', { count: 1 });
}

describe('pickLanguage', () => {
  it('follows the first device locale we have a catalogue for', () => {
    expect(pickLanguage(['vi-VN', 'en-US'])).toBe('vi');
    expect(pickLanguage(['en-GB', 'vi-VN'])).toBe('en');
    expect(pickLanguage(['fr-FR', 'vi_VN', 'en-US'])).toBe('vi');
    expect(pickLanguage(['VI'])).toBe('vi');
  });

  it('falls back to English', () => {
    expect(pickLanguage([])).toBe('en');
    expect(pickLanguage(['fr-FR', 'ja-JP'])).toBe('en');
    expect(pickLanguage(['vie-VN'])).toBe('en');
  });

  it('lets a stored choice override the device, and ignores a choice we do not ship', () => {
    expect(pickLanguage(['vi-VN'], 'en')).toBe('en');
    expect(pickLanguage(['en-US'], 'vi')).toBe('vi');
    expect(pickLanguage(['vi-VN'], 'fr')).toBe('vi');
    expect(pickLanguage(['vi-VN'], null)).toBe('vi');
  });
});
