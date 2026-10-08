import { DAY_MS, type Instant, type SettingsRow } from '@scootch/domain';

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
 * What the link's own screen shows: `opened` is what opening the link came to (`null` until it
 * has), and `day` is today as it is now, not as it was when the page was read. The monster's card
 * and its question stay up only while the day would still ask: the moment the day turns heavy or
 * to a crisis (an answer that was on its way came back so), the screen leaves, as it does for home.
 */
export function linkScreenFor(
  opened: { readonly kind: 'home' } | { readonly kind: 'ask'; readonly page: MonsterPage } | null,
  day: DayForArrival,
): 'opening' | 'ask' | 'leave' {
  if (opened === null) return 'opening';
  if (opened.kind === 'home') return 'leave';
  return arrivalFor(opened.page, day).kind === 'ask' ? 'ask' : 'leave';
}

/**
 * A session whose screens are up: under way, or showing how it ended. Nothing is put over it; a
 * session that is only set, or was left, has no screen of its own.
 */
export function sessionIsUp(session: { readonly phase: string } | null): boolean {
  return session !== null && session.phase !== 'set' && session.phase !== 'left_early';
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

/** A link kept longer than this is dropped unopened: whoever tapped it has long moved on. */
export const KEPT_LINK_MS = 7 * DAY_MS;

function dropBoth(shared: SharedStore): void {
  shared.remove(SHARED_KEYS.clipLink);
  shared.remove(SHARED_KEYS.clipLinkStoredAt);
}

/**
 * The link that is waiting to be opened, left where it is: the one the App Clip was opened with,
 * or one tapped while the app could not take it. It stays kept until its thing is on the phone
 * or its page turns out to have nothing to give, so a launch with no connection does not lose
 * the monster. A link that is not a monster's is dropped (the clip is only ever opened from a
 * monster's link), and so is one kept for more than seven days. A link kept with no time is
 * counted from now.
 */
export function keptLink(shared: SharedStore, now: Instant): `/m/${string}` | null {
  try {
    const stored = shared.get(SHARED_KEYS.clipLink);
    if (stored === null) return null;
    const route = monsterRouteOf(stored);
    // The clip writes the time as seconds since 1970.
    const keptAt = Number(shared.get(SHARED_KEYS.clipLinkStoredAt) ?? Number.NaN) * 1000;
    if (route === null || now - keptAt > KEPT_LINK_MS) {
      dropBoth(shared);
      return null;
    }
    if (!Number.isFinite(keptAt)) shared.set(SHARED_KEYS.clipLinkStoredAt, String(now / 1000));
    return route;
  } catch {
    return null;
  }
}

/** The kept link is done with. With a route, only when it is that link which is kept. */
export function dropKeptLink(shared: SharedStore, route?: `/m/${string}`): void {
  try {
    const stored = shared.get(SHARED_KEYS.clipLink);
    if (stored === null) return;
    if (route === undefined || monsterRouteOf(stored) === route) dropBoth(shared);
  } catch {
    // Looked at again the next time the app comes to the front.
  }
}

/** A link that cannot be opened yet is kept where the clip keeps its own, to be opened later. */
export function holdLink(shared: SharedStore, route: `/m/${string}`, now: Instant): void {
  try {
    if (monsterRouteOf(shared.get(SHARED_KEYS.clipLink) ?? '') === route) return;
    shared.set(SHARED_KEYS.clipLink, `scootch:/${route}`);
    shared.set(SHARED_KEYS.clipLinkStoredAt, String(now / 1000));
  } catch {
    // With no App Group there is nowhere to keep it.
  }
}

/** What of the app decides whether a kept link may be opened yet. */
export interface LinkGate {
  readonly ready: boolean;
  readonly settings: Pick<SettingsRow, 'firstLaunchDoneAt'>;
  readonly today: { readonly kind: string };
}

/**
 * A kept link waits for a phone that is ready for it: first launch is behind it, no world is
 * waiting to be offered back, and the day is not a crisis day (nothing opens over the care
 * screen). `restoreWaits` is whether a restore has been found and not yet answered.
 */
export function linkMayOpen(app: LinkGate, restoreWaits: boolean): boolean {
  if (!app.ready || app.settings.firstLaunchDoneAt === null) return false;
  return !restoreWaits && app.today.kind !== 'crisis';
}

/** True when reading the page failed because there is no such page, not for want of a connection. */
export function isNoSuchPage(error: unknown): boolean {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  return status === 404 || code === 'not_found';
}
