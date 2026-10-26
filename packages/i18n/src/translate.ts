import type { Catalogue, Entry, Language, ParamsArgument, StringKey } from './catalogue-types';
import { en } from './en';
import { vi } from './vi';

export const catalogues: { readonly [L in Language]: Catalogue } = { en, vi };

const pluralRules = new Map<Language, Intl.PluralRules>();

/**
 * The plural category of a number. Uses `Intl.PluralRules`; on an engine that ships without it,
 * falls back to the two rules these languages need (English: one or other; Vietnamese: other).
 */
function pluralCategory(language: Language, count: number): Intl.LDMLPluralRule {
  if (typeof Intl === 'undefined' || typeof Intl.PluralRules !== 'function') {
    return language === 'en' && count === 1 ? 'one' : 'other';
  }
  let rules = pluralRules.get(language);
  if (!rules) {
    rules = new Intl.PluralRules(language);
    pluralRules.set(language, rules);
  }
  return rules.select(count);
}

/**
 * One catalogue entry as text in a language. `{name}` placeholders are filled from `values`; a
 * plural entry picks its form from `values.count`.
 */
export function textOf(
  entry: Entry,
  language: Language,
  values: Readonly<Record<string, string | number>> = {},
): string {
  let text: string;
  if (typeof entry === 'string') {
    text = entry;
  } else {
    const count = values['count'];
    const category = typeof count === 'number' ? pluralCategory(language, count) : 'other';
    text = entry[category] ?? entry.other;
  }
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}

/** The interface string for a key, in a language, with its placeholders filled. */
export function t<Key extends StringKey>(
  language: Language,
  key: Key,
  ...[params]: ParamsArgument<Key>
): string {
  return textOf(catalogues[language][key], language, params ?? {});
}
