import type { Language } from '@scootch/i18n';

/** The website's pages of shared things: a haunt, a table invite, a caught card and a story. */
export type SharedPageKind = 'h' | 't' | 'c' | 's';

/**
 * The address of one shared thing's page: the site, the Vietnamese path when the sharer reads
 * Vietnamese, the kind and the id. Nothing else is ever put in a link: no name, no account and no
 * query.
 */
export function sharedPageLink(
  site: string,
  language: Language,
  kind: SharedPageKind,
  id: string,
): string {
  return `${site}${language === 'vi' ? '/vi' : ''}/${kind}/${encodeURIComponent(id)}`;
}
