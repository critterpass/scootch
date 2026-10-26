import type { Language } from '@phusclass/i18n';

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

/** The words of the not-found page, the Help page and the pages around launch. */
export function pagesFor(language: Language): PagesCopy {
  return pages[language];
}

/** The words of the plain pages: privacy, terms, support and helplines. */
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

/** The app's App Store listing. */
export const appStoreUrl = 'https://apps.apple.com/app/id6827278250';

/**
 * Before launch the site has no App Store badge and no way into the app. Set when the site is
 * bundled, with PUBLIC_PRE_LAUNCH=1.
 */
export const preLaunch = import.meta.env.PUBLIC_PRE_LAUNCH === '1';
