import type { Language } from '@scootch/domain';

import { stripMarks, wordsOf } from './text';

/** Words that say nothing about which task a sentence means. */
const fillerWords: Readonly<Record<Language, ReadonlySet<string>>> = {
  en: new Set([
    'the',
    'and',
    'for',
    'with',
    'about',
    'from',
    'that',
    'this',
    'your',
    'into',
    'some',
    'one',
    'out',
    'get',
    'back',
  ]),
  vi: new Set(['cái', 'mấy', 'của', 'cho', 'với', 'và', 'là', 'một', 'đi', 'lại', 'ra', 'vụ']),
};

/** A word reduced far enough that "called" and "call", or "gọi" typed as "goi", compare equal. */
function stem(word: string, language: Language): string {
  const bare = stripMarks(word);
  return language === 'en' ? bare.replace(/'s$/, '').slice(0, 4) : bare;
}

function contentStems(text: string, language: Language): string[] {
  const shortest = language === 'en' ? 3 : 2;
  return wordsOf(text)
    .filter((word) => word.length >= shortest && !fillerWords[language].has(word))
    .map((word) => stem(word, language));
}

/**
 * How much of a reworded item comes from the source text: the share of its content words that
 * the source also uses, 0 to 1. An invented task shares few; a reworded one shares most.
 */
export function groundedShare(item: string, source: string, language: Language): number {
  const stems = contentStems(item, language);
  if (stems.length === 0) return 0;
  const known = new Set(wordsOf(source).map((word) => stem(word, language)));
  return stems.filter((word) => known.has(word)).length / stems.length;
}

/** True when at least half of the item's content words come from the source text. */
export function isGroundedIn(item: string, source: string, language: Language): boolean {
  return groundedShare(item, source, language) >= 0.5;
}
