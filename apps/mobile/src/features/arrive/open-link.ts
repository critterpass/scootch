import type { Instant } from '@scootch/domain';

import type { MonsterPage } from '../../api/monster-page-api';
import { holderOfPage, type PageHolders } from '../../state/arrived-pages';
import type { DayStore } from '../../state/day-store';
import type { KeptShares } from '../share/kept-shares';
import type { SharedStore } from '../surfaces/surface-ports';

import {
  arrivalFor,
  dropKeptLink,
  holdLink,
  isNoSuchPage,
  keptLink,
  linkMayOpen,
  pageIdFrom,
  rememberPage,
  sessionIsUp,
} from './arrive-rules';

/** What opening a monster's link needs of the phone. */
export interface LinkPorts {
  readonly store: Pick<DayStore, 'getState' | 'subscribe' | 'dispatch'>;
  /** `GET /v1/monster-page/:id`. Rejects when there is no such page, or it could not be reached. */
  readonly read: (id: string) => Promise<MonsterPage>;
  readonly kept: KeptShares;
  /** The App Group, where a link that has to wait is kept. */
  readonly shared: SharedStore;
  readonly holders: PageHolders;
  /** Whether a world has been found to offer back and the person has not answered yet. */
  readonly restoreWaits: () => Promise<boolean>;
  readonly now: () => Instant;
}

/** What the screen does once a link has been opened. */
export type Opened =
  /** Home, or the screen the link was opened over. `taken` settles when a thing was taken in. */
  | { readonly kind: 'home'; readonly taken?: Promise<boolean> }
  /** The page hides the words: the monster's card is shown and the thing is asked for. */
  | { readonly kind: 'ask'; readonly page: MonsterPage };

const HOME: Opened = { kind: 'home' };

function untilReady(store: LinkPorts['store']): Promise<void> {
  return new Promise((done) => {
    if (store.getState().ready) return done();
    const stop = store.subscribe(() => {
      if (!store.getState().ready) return;
      stop();
      done();
    });
  });
}

const restoreWaiting = (ports: Pick<LinkPorts, 'restoreWaits'>) =>
  ports.restoreWaits().catch(() => false);

/**
 * Takes a monster's thing in, as a thing shared from another app is, with its page. It runs to
 * its end whatever becomes of the screen that asked. Once the thing is on the phone (a task or a
 * drawer item holds the page) the kept link is dropped and the page is remembered for the catch;
 * words the day would not take leave nothing behind. Answers whether the thing is on the phone.
 */
export async function takeIn(ports: LinkPorts, page: MonsterPage, text: string): Promise<boolean> {
  const { store, shared, kept, holders } = ports;
  // A crisis day takes nothing in. The link is left as it is, to be asked about another day.
  if (store.getState().today.kind === 'crisis') return false;
  const settle = async () => {
    if ((await holderOfPage(holders, page.id)) === null) return false;
    dropKeptLink(shared, `/m/${page.id}`);
    await rememberPage(kept, page).catch(() => undefined);
    return true;
  };
  // The row is written long before everything the event left arriving has come, so each change
  // of the day is a chance to see it there.
  let held: Promise<boolean> = Promise.resolve(false);
  const look = () => {
    held = held.then((already) => already || settle()).catch(() => false);
  };
  const stop = store.subscribe(look);
  await store
    .dispatch({ type: 'thing_shared_in', text, when: 'now', monsterPage: page.id })
    .catch(() => undefined);
  stop();
  look();
  const here = await held;
  // Not on the phone and nothing being asked about: the words turned the day to care, or the
  // person took them back into their own hands. Either way the link has had its answer.
  if (!here && store.getState().taskCall === 'idle') dropKeptLink(shared, `/m/${page.id}`);
  return here;
}

/**
 * A monster's link is opened: `scootch.app/m/<id>` in either language, the app's scheme, or the
 * link that was kept. Nothing here depends on a screen staying up, so a link that launches the
 * app into a session under way still has its thing taken in.
 *
 * - Before first launch is done, or while a world waits to be offered back, the link is kept and
 *   opened afterwards.
 * - A page that cannot be reached leaves a kept link kept, for the next time the app comes to
 *   the front. An id nobody has and a monster already caught end it.
 * - A page whose thing is already on the phone takes nothing in again.
 * - While a session's screens are up, a page that hides its words is not asked about: the link
 *   is kept until the session is over. Words a page shows are still taken in underneath.
 */
export async function openLink(ports: LinkPorts, part: string | undefined): Promise<Opened> {
  const { store, shared } = ports;
  const id = pageIdFrom(part);
  if (id === null) return HOME;
  const route = `/m/${id}` as const;
  await untilReady(store);
  const { settings } = store.getState();
  if (settings.firstLaunchDoneAt === null || (await restoreWaiting(ports))) {
    holdLink(shared, route, ports.now());
    return HOME;
  }

  let page: MonsterPage;
  try {
    page = await ports.read(id);
  } catch (error) {
    if (isNoSuchPage(error)) dropKeptLink(shared, route);
    return HOME;
  }
  if (page.status !== 'wild') {
    dropKeptLink(shared, route);
    return HOME;
  }
  if ((await holderOfPage(ports.holders, id)) !== null) {
    dropKeptLink(shared, route);
    await rememberPage(ports.kept, page).catch(() => undefined);
    return HOME;
  }
  // The day as it is now, with the page read: a crisis that began meanwhile takes nothing.
  const { today, heavyToday } = store.getState();
  const arrival = arrivalFor(page, { crisis: today.kind === 'crisis', heavy: heavyToday });
  if (arrival.kind === 'take_in') return { kind: 'home', taken: takeIn(ports, page, arrival.text) };
  // Nothing is asked over a session: the link is kept, and asks once the session is over.
  if (arrival.kind === 'ask' && sessionIsUp(store.getState().session)) {
    holdLink(shared, route, ports.now());
    return HOME;
  }
  return arrival;
}

/**
 * The link that was kept is opened, when the phone is ready for it: at launch, each time the app
 * comes to the front, and as first launch finishes. It is opened with no screen of its own, the
 * way a thing shared from another app is taken in, so a page that cannot be reached shows
 * nothing; only a page that hides its words is shown, by `show`, to ask for the thing. Answers
 * what it came to, or `null` when there was no link or it has to wait.
 */
export async function openKeptLink(
  ports: LinkPorts,
  show: (route: `/m/${string}`) => void,
): Promise<Opened | null> {
  const route = keptLink(ports.shared, ports.now());
  if (route === null) return null;
  const app = () => ports.store.getState();
  // First launch and a crisis day are known here; only then is the server asked about a restore.
  if (!linkMayOpen(app(), false)) return null;
  if (!linkMayOpen(app(), await restoreWaiting(ports))) return null;
  const opened = await openLink(ports, route.slice('/m/'.length));
  if (opened.kind === 'ask') show(route);
  return opened;
}
