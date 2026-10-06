import { t, type Language } from '@scootch/i18n';

import { en, type Loosen, type SiteCopy } from './en';
import { pagesEn } from './pages-en';
import { pagesVi } from './pages-vi';
import { plainEn } from './plain-en';
import { plainVi } from './plain-vi';
import { vi } from './vi';

const copies: Readonly<Record<Language, SiteCopy>> = { en, vi };

export type { SiteCopy };
export type PagesCopy = Loosen<typeof pagesEn>;
export type PlainCopy = Loosen<typeof plainEn>;

const pages: Readonly<Record<Language, PagesCopy>> = { en: pagesEn, vi: pagesVi };
const plain: Readonly<Record<Language, PlainCopy>> = { en: plainEn, vi: plainVi };

/** The words of the shared pages, Plus and the pages around launch. */
export function pagesFor(language: Language): PagesCopy {
  return pages[language];
}

/** The words of the plain pages: privacy, terms, support, helplines and the rest. */
export function plainFor(language: Language): PlainCopy {
  return plain[language];
}

/** English at the root and Vietnamese under `/vi`, for pages built once per language. */
export function languagePaths(): { params: { lang: string | undefined } }[] {
  return [{ params: { lang: undefined } }, { params: { lang: 'vi' } }];
}

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

/**
 * Before launch the site has no App Store badge and no way into the app: "Catch it in the app"
 * becomes one email field. Set when the site is bundled, with PUBLIC_PRE_LAUNCH=1.
 */
export const preLaunch = import.meta.env.PUBLIC_PRE_LAUNCH === '1';
