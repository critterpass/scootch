import type { Language } from '@phusclass/i18n';

import { en, type Loosen, type SiteCopy } from './en';
import { helpEn } from './help-en';
import { helpVi } from './help-vi';
import { legalEn } from './legal-en';
import { legalVi } from './legal-vi';
import { vi } from './vi';

export type { SiteCopy };
export type LegalCopy = Loosen<typeof legalEn>;
export type HelpCopy = Loosen<typeof helpEn>;

const site: Readonly<Record<Language, SiteCopy>> = { en, vi };
const legal: Readonly<Record<Language, LegalCopy>> = { en: legalEn, vi: legalVi };
const help: Readonly<Record<Language, HelpCopy>> = { en: helpEn, vi: helpVi };

export const languages: readonly Language[] = ['en', 'vi'];

/** The site's words in one language: its chrome, the home page, tuition and not-found. */
export function copyFor(language: Language): SiteCopy {
  return site[language];
}

/** Privacy and terms. */
export function legalFor(language: Language): LegalCopy {
  return legal[language];
}

/** Support and helplines. */
export function helpFor(language: Language): HelpCopy {
  return help[language];
}

/** English at the root and Vietnamese under `/vi`, for pages built once per language. */
export function languagePaths(): { params: { lang: string | undefined } }[] {
  return [{ params: { lang: undefined } }, { params: { lang: 'vi' } }];
}

/** The language a page built by `languagePaths` is in. */
export function pageLanguage(lang: string | undefined): Language {
  return lang === 'vi' ? 'vi' : 'en';
}

/** English lives at the root and Vietnamese under `/vi`; a page has the same path in both. */
export function localPath(language: Language, path: `/${string}`): string {
  if (language === 'en') return path;
  return path === '/' ? '/vi/' : `/vi${path}`;
}

/** Every page of the site, by its English path: the sitemap and the link previews read this. */
export const sitePages = ['/', '/tuition', '/support', '/privacy', '/terms', '/helplines'] as const;
export type SitePage = (typeof sitePages)[number];

/** The app's App Store listing. */
export const appStoreUrl = 'https://apps.apple.com/app/id6827278250';

/**
 * Before launch the site shows "Coming soon to the App Store" in place of the badge and has no
 * way into the store. Set when the site is bundled, with PUBLIC_PRE_LAUNCH=1 (the deploy reads
 * the repository variable SITE_PRE_LAUNCH into it).
 */
export const preLaunch = import.meta.env.PUBLIC_PRE_LAUNCH === '1';
