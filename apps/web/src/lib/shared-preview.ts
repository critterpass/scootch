import type { Language } from '@scootch/i18n';

import { togetherEn } from '../copy/together-en';
import { togetherVi } from '../copy/together-vi';

/**
 * The pages of shared things and the API route each one reads: a monster's own page, a caught
 * card, a share story, a table invite, a haunt and a week's record.
 */
export const sharedKinds = {
  m: { route: 'monster-page' },
  c: { route: 'shared-card' },
  s: { route: 'shared-story' },
  t: { route: 'table-invite' },
  h: { route: 'haunt-page' },
  r: { route: 'shared-record' },
} as const;
export type SharedKind = keyof typeof sharedKinds;

/** An invite and a haunt are for one reader: no search engine is to keep their pages. */
export const forOneReader = (kind: SharedKind): boolean => kind === 't' || kind === 'h';

export type Preview = { title: string; description: string; image: string | null };

const together = { en: togetherEn, vi: togetherVi } as const;
const named = (line: string, name: string): string => line.replace('{name}', name);

/**
 * What a link to this shared thing should say, from only what was shared. Null when there is
 * nothing to say: the answer is not the shape expected, the table has closed or the haunt has gone.
 */
export function previewOf(
  kind: SharedKind,
  shared: Record<string, unknown>,
  page: URL,
  language: Language,
): Preview | null {
  const copy = together[language];
  if (kind === 'm') {
    const { name, flavourText } = shared;
    if (typeof name !== 'string' || typeof flavourText !== 'string') return null;
    return {
      title: name,
      description: flavourText,
      image: new URL(`/m/${String(shared['id'])}/preview.png`, page).href,
    };
  }
  if (kind === 't') {
    if (shared['state'] !== 'open') return null;
    const host = shared['hostName'];
    return {
      title: typeof host === 'string' ? named(copy.invite.headlineBy, host) : copy.invite.headline,
      description: copy.invite.description,
      image: null,
    };
  }
  if (kind === 'h') {
    if (shared['state'] !== 'waiting') return null;
    const sender = (shared['from'] as { displayName?: unknown } | null | undefined)?.displayName;
    return {
      title:
        typeof sender === 'string' ? named(copy.haunt.headlineBy, sender) : copy.haunt.headline,
      description: copy.haunt.description,
      image: null,
    };
  }
  if (kind === 'r') {
    const { title } = shared;
    if (typeof title !== 'string') return null;
    return { title, description: copy.record.description, image: null };
  }
  const card = shared['card'] as { name?: unknown; flavourText?: unknown } | undefined;
  if (typeof card?.name !== 'string' || typeof card.flavourText !== 'string') return null;
  const headline = shared['headline'];
  return {
    title: kind === 's' && typeof headline === 'string' ? headline : card.name,
    description: card.flavourText,
    image: null,
  };
}
