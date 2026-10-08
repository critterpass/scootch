import type { MonsterPage } from '../../api/monster-page-api';
import { arrivedMonsterKey, withShare, type KeptShares } from '../share/kept-shares';
import { SHARED_KEYS, type SharedStore } from '../surfaces/surface-ports';

/** What opening a monster's link does. */
export type Arrival =
  /** Its thing is taken in, carrying the page, and home is shown. */
  | { readonly kind: 'take_in'; readonly page: MonsterPage; readonly text: string }
  /** The page hides the words: the monster's card is shown and the thing is asked for. */
  | { readonly kind: 'ask'; readonly page: MonsterPage }
  /** Home, and nothing else. */
  | { readonly kind: 'home' };

/** What of today the rules read: a crisis day, and a day with something heavy in it. */
export interface DayForArrival {
  readonly crisis: boolean;
  readonly heavy: boolean;
}

/**
 * The rules of a monster's link. `page` is `null` for an id nobody has, and for a page that could
 * not be read. Only a wild monster arrives: one already caught was somebody's, and is not caught
 * twice. A crisis day takes nothing in, and no monster's card is shown beside something heavy.
 */
export function arrivalFor(page: MonsterPage | null, day: DayForArrival): Arrival {
  if (page === null || page.status !== 'wild' || day.crisis) return { kind: 'home' };
  const text = page.typed?.trim() ?? '';
  if (text !== '') return { kind: 'take_in', page, text };
  return day.heavy ? { kind: 'home' } : { kind: 'ask', page };
}

/**
 * Remembers the page a monster arrived from, by the seed the monster is drawn from, where the
 * pages this phone shared are kept. Only a monster with that very seed is ever looked up by it.
 */
export async function rememberPage(kept: KeptShares, page: MonsterPage): Promise<void> {
  const share = {
    key: arrivedMonsterKey(page.seed),
    id: page.id,
    unshareToken: '',
    language: page.language,
    taskShown: page.typed !== null,
  };
  await kept.write(withShare(await kept.read(), share));
}

/** A page's id as the website makes them: letters, digits and hyphens, never a path. */
const PAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The id a link's last part names, or `null` when it could not be one. */
export function pageIdFrom(part: string | undefined): string | null {
  return part !== undefined && PAGE_ID.test(part) ? part : null;
}

/**
 * The app's own route for a link to a monster's page, or `null` for any other link. It reads the
 * website's link in either language (`https://scootch.app/m/<id>`, `…/vi/m/<id>`) and the app's
 * scheme (`scootch://m/<id>`), and drops whatever follows the id.
 */
export function monsterRouteOf(link: string): `/m/${string}` | null {
  const [, afterScheme = ''] = /^[a-z][a-z0-9+.-]*:\/\/([^?#]*)/i.exec(link.trim()) ?? [];
  const parts = afterScheme.split('/').filter((part) => part !== '');
  // A website link starts with its host; the app's scheme starts with the path itself.
  if (parts[0] !== 'm' && parts[0] !== 'vi') parts.shift();
  if (parts[0] === 'vi') parts.shift();
  const id = parts[0] === 'm' && parts.length === 2 ? pageIdFrom(parts[1]) : null;
  return id === null ? null : `/m/${id}`;
}

/**
 * The link the App Clip was opened with, taken once: it is cleared before anything is done with
 * it, so it is never opened a second time. `null` when the clip kept none, or kept a link that is
 * not a monster's.
 */
export function takeClipLink(shared: SharedStore): `/m/${string}` | null {
  let stored: string | null;
  try {
    stored = shared.get(SHARED_KEYS.clipLink);
    if (stored === null) return null;
    shared.remove(SHARED_KEYS.clipLink);
    shared.remove(SHARED_KEYS.clipLinkStoredAt);
  } catch {
    return null;
  }
  return monsterRouteOf(stored);
}
