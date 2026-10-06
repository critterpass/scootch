import { t, type Language } from '@scootch/i18n';

import { en, type SiteCopy } from './en';
import { vi } from './vi';

const copies: Readonly<Record<Language, SiteCopy>> = { en, vi };

export type { SiteCopy };

/** The site's words in one language. */
export function copyFor(language: Language): SiteCopy {
  return copies[language];
}

/** English lives at the root and Vietnamese under `/vi`; a page has the same path in both. */
export function localPath(language: Language, path: `/${string}`): string {
  if (language === 'en') return path;
  return path === '/' ? '/vi/' : `/vi${path}`;
}

/** Fills the `{name}` placeholders of a line. */
export function fill(line: string, values: Readonly<Record<string, string>>): string {
  return line.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}

/** The words the site shares with the app. */
export function brand(language: Language): { name: string; plus: string } {
  return { name: t(language, 'brand.name'), plus: t(language, 'brand.plus') };
}

/**
 * Where the App Store button goes. The listing's own address replaces this once the listing
 * exists.
 */
export const appStoreUrl = 'https://apps.apple.com/app/scootch';
