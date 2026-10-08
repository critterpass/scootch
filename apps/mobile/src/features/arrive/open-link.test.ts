import { describe, expect, it } from '@jest/globals';

import { ApiClientError } from '../../api/api-error';
import { monsterPageFrom, type MonsterPage } from '../../api/monster-page-api';
import { openRepositories } from '../../data/repositories';
import { openTestDatabase, type TestDatabase } from '../../data/test/open-test-database';
import { arrivedPagesStore, holderOfPage } from '../../state/arrived-pages';
import { takenOnToday } from '../../state/shared-in';
import { stagedPhone, stagedServer, type StagedServer } from '../../state/test/staged-phone';
import { arrivedMonsterKey, memoryKeptShares } from '../share/kept-shares';
import { SHARED_KEYS, type SharedStore } from '../surfaces/surface-ports';

import { keptLink } from './arrive-rules';
import { openKeptLink, openLink, takeIn, type LinkPorts, type Opened } from './open-link';

/** A monster's page as `GET /v1/monster-page/:id` answers it. */
const wild: MonsterPage = monsterPageFrom({
  id: 'molar-7f3k9x',
  seed: 'dentist-seed',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  language: 'en',
  typed: 'Book the dentist before Thursday',
  status: 'wild',
});
const ROUTE = '/m/molar-7f3k9x';
const LINK = 'https://scootch.app/m/molar-7f3k9x';
const unreachable = () =>
  Promise.reject(new ApiClientError('network', false, null, 'The server could not be reached'));

/** Whether opening the link put its thing on the phone, once that is known. */
const taken = (opened: Opened): Promise<boolean> =>
  (opened.kind === 'home' ? opened.taken : undefined) ?? Promise.resolve(false);

function sharedStore(values: Record<string, string> = {}): SharedStore {
  const kept = new Map(Object.entries(values));
  return {
    get: (key) => kept.get(key) ?? null,
    set: (key, value) => void kept.set(key, value),
    remove: (key) => void kept.delete(key),
    reloadSurfaces: () => undefined,
  };
}

/** A phone whose App Group holds the link the App Clip was opened with. */
async function phone(
  changes: { server?: StagedServer; database?: TestDatabase; clipLink?: boolean } = {},
) {
  const server = changes.server ?? stagedServer();
  const app = await stagedPhone(server, changes.database);
  const shared = sharedStore(changes.clipLink === false ? {} : { [SHARED_KEYS.clipLink]: LINK });
  const kept = memoryKeptShares();
  const read = { calls: 0, answer: (): Promise<MonsterPage> => Promise.resolve(wild) };
  const restore = { waits: false };
  const ports: LinkPorts = {
    store: app.store,
    read: () => {
      read.calls += 1;
      return read.answer();
    },
    kept,
    shared,
    holders: {
      repositories: openRepositories(app.data.db),
      arrivedPages: arrivedPagesStore(app.data.db),
    },
    restoreWaits: () => Promise.resolve(restore.waits),
    now: () => app.time.clock.now(),
  };
  const linkKept = () => keptLink(shared, app.time.clock.now());
  return { server, app, shared, kept, read, restore, ports, linkKept };
}

describe("opening a monster's link, through to the thing on the phone", () => {
  it('keeps the kept link when the page cannot be reached, and takes the thing in the next time', async () => {
    const { server, app, kept, read, ports, linkKept } = await phone();
    read.answer = unreachable;
    expect(await openLink(ports, wild.id)).toEqual({ kind: 'home' });
    expect(linkKept()).toBe(ROUTE);
    expect(server.asked).toHaveLength(0);

    read.answer = () => Promise.resolve(wild);
    const opened = await openLink(ports, wild.id);
    expect(opened.kind).toBe('home');
    expect(await taken(opened)).toBe(true);

    expect(server.asked).toMatchObject([{ text: wild.typed, monsterPage: wild.id }]);
    expect(app.task().screen).toBe('pass');
    // Only now, with the thing on the phone, is the link dropped and the page remembered.
    expect(linkKept()).toBeNull();
    expect(await kept.read()).toMatchObject([{ key: arrivedMonsterKey(wild.seed), id: wild.id }]);
  });

  it('drops the kept link for a page nobody has, and for a monster already caught', async () => {
    const none = await phone();
    none.read.answer = () =>
      Promise.reject(new ApiClientError('not_found', false, 404, 'No such shared monster'));
    expect(await openLink(none.ports, wild.id)).toEqual({ kind: 'home' });
    expect(none.linkKept()).toBeNull();

    const caught = await phone();
    caught.read.answer = () => Promise.resolve({ ...wild, status: 'caught' });
    expect(await openLink(caught.ports, wild.id)).toEqual({ kind: 'home' });
    expect(caught.linkKept()).toBeNull();
    expect(caught.server.asked).toHaveLength(0);
    expect(await caught.kept.read()).toEqual([]);
  });

  it('takes the thing in once when its link is opened twice, by the clip and by a tap', async () => {
    const { server, app, ports } = await phone();
    const [first, second] = await Promise.all([openLink(ports, wild.id), openLink(ports, wild.id)]);
    await Promise.all([first, second].map(taken));
    // And once more, when the thing is already today's.
    expect(await openLink(ports, wild.id)).toEqual({ kind: 'home' });

    expect(server.asked).toHaveLength(1);
    const { tasks, drawerItems } = openRepositories(app.data.db);
    expect(await tasks.all()).toHaveLength(1);
    expect((await drawerItems.all()).map((item) => item.text)).not.toContain(wild.typed);
  });

  it('sends the asked-for thing once however often send is tapped', async () => {
    const { server, app, ports } = await phone();
    const hidden = { ...wild, typed: null };
    await Promise.all([
      takeIn(ports, hidden, 'Book the dentist'),
      takeIn(ports, hidden, 'Book the dentist'),
    ]);

    expect(server.asked).toHaveLength(1);
    expect(await openRepositories(app.data.db).tasks.all()).toHaveLength(1);
  });

  it('remembers no page, and keeps no link, for words the day would not take', async () => {
    const { app, kept, read, ports, linkKept } = await phone();
    read.answer = () =>
      Promise.resolve({ ...wild, typed: 'Thinking about ending my life tonight' });
    const opened = await openLink(ports, wild.id);
    expect(await taken(opened)).toBe(false);

    expect(app.store.getState().today.kind).toBe('crisis');
    expect(await kept.read()).toEqual([]);
    expect(linkKept()).toBeNull();
    expect(app.data.dump()).not.toContain(wild.id);
  });

  it('keeps the kept link through the wait for an answer, and drops it when the wait is cancelled', async () => {
    const server = stagedServer({ startStage: () => new Promise<never>(() => undefined) });
    const { app, kept, ports, linkKept } = await phone({ server });
    const opened = await openLink(ports, wild.id);
    await app.until(() => app.store.getState().taskCall === 'waiting');
    // Closed now, the app would find the link again at its next launch.
    expect(linkKept()).toBe(ROUTE);

    await app.store.dispatch({ type: 'task_call_cancelled' });
    expect(await taken(opened)).toBe(false);
    expect(app.store.getState().returnedText).toBe(wild.typed);
    expect(linkKept()).toBeNull();
    expect(await kept.read()).toEqual([]);
  });

  it('takes the thing in with no screen to show it, in the middle of a session', async () => {
    const { app, ports, linkKept } = await phone();
    await app.say('Water the plants', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.store.getState().session?.phase).toBe('running');

    // Nothing is rendered here: the link is opened and its thing taken in by themselves.
    const opened = await openLink(ports, wild.id);
    expect(await taken(opened)).toBe(true);

    const parked = app.store.getState().drawer.items.find((item) => item.text === wild.typed);
    expect(parked).toBeDefined();
    expect(await holderOfPage(ports.holders, wild.id)).toBe(parked?.id);
    expect(app.store.getState().session?.phase).toBe('running');
    expect(linkKept()).toBeNull();
  });
});

describe('a link that arrives before the phone is ready for it', () => {
  it('waits for first launch to be done, the clip’s link and a tapped one alike', async () => {
    const fresh = await phone({ database: await openTestDatabase(), clipLink: false });
    const { server, app, read, ports, linkKept } = fresh;
    expect(app.store.getState().settings.firstLaunchDoneAt).toBeNull();
    const shows: string[] = [];
    const show = (route: string) => void shows.push(route);

    // Tapped while first launch is showing: nothing is read or taken in, and the link is kept.
    expect(await openLink(ports, wild.id)).toEqual({ kind: 'home' });
    expect(linkKept()).toBe(ROUTE);
    expect(await openKeptLink(ports, show)).toBeNull();
    expect(read.calls).toBe(0);
    expect(await openRepositories(app.data.db).tasks.all()).toEqual([]);

    await app.store.dispatch({
      type: 'settings_changed',
      changes: { firstLaunchDoneAt: '2026-10-06T09:05:00.000Z' },
    });
    const opened = await openKeptLink(ports, show);
    expect(await taken(opened ?? { kind: 'home' })).toBe(true);
    expect(server.asked).toMatchObject([{ text: wild.typed, monsterPage: wild.id }]);
    // Its thing came in the way a shared thing does: no screen of its own was shown.
    expect(shows).toEqual([]);
    expect(linkKept()).toBeNull();
  });

  it('waits for a restore offer to be answered', async () => {
    const { server, read, restore, ports, linkKept } = await phone();
    restore.waits = true;
    const show = () => undefined;

    expect(await openKeptLink(ports, show)).toBeNull();
    expect(await openLink(ports, wild.id)).toEqual({ kind: 'home' });
    expect(read.calls).toBe(0);
    expect(server.asked).toHaveLength(0);
    expect(linkKept()).toBe(ROUTE);

    restore.waits = false;
    expect(await taken((await openKeptLink(ports, show)) ?? { kind: 'home' })).toBe(true);
    expect(server.asked).toHaveLength(1);
  });

  it('is not opened on a crisis day, and is still kept the day after', async () => {
    const { app, read, ports, linkKept } = await phone();
    await app.say('Thinking about ending my life tonight', 'typed');
    expect(app.store.getState().today.kind).toBe('crisis');

    expect(await openKeptLink(ports, () => undefined)).toBeNull();
    expect(read.calls).toBe(0);
    expect(linkKept()).toBe(ROUTE);
  });

  it('shows nothing while its page cannot be reached, and asks only for words a page hides', async () => {
    const { read, ports, linkKept } = await phone();
    const shows: string[] = [];
    const show = (route: string) => void shows.push(route);

    read.answer = unreachable;
    expect(await openKeptLink(ports, show)).toEqual({ kind: 'home' });
    expect(shows).toEqual([]);
    expect(linkKept()).toBe(ROUTE);

    const hidden = { ...wild, typed: null };
    read.answer = () => Promise.resolve(hidden);
    expect(await openKeptLink(ports, show)).toEqual({ kind: 'ask', page: hidden });
    expect(shows).toEqual([ROUTE]);
    // Kept until the person answers: sent, its thing is on the phone and the link is done with.
    expect(linkKept()).toBe(ROUTE);
    expect(await takeIn(ports, hidden, 'Book the dentist')).toBe(true);
    expect(linkKept()).toBeNull();
  });
});

describe('a link whose page hides its words, while a session is up', () => {
  const hidden = { ...wild, typed: null };

  async function midSession() {
    const made = await phone();
    made.read.answer = () => Promise.resolve(hidden);
    const { app } = made;
    await app.say('Water the plants', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.store.getState().session?.phase).toBe('running');
    return made;
  }

  it('is never shown over the session, and is still kept when the session is over', async () => {
    const { app, ports, linkKept } = await midSession();
    const shows: string[] = [];
    const show = (route: string) => void shows.push(route);

    expect(await openKeptLink(ports, show)).toEqual({ kind: 'home' });
    expect(shows).toEqual([]);
    expect(linkKept()).toBe(ROUTE);

    app.time.advanceTo(app.time.clock.now() + 7 * 60_000);
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    // The session's last screens are still up.
    expect(await openKeptLink(ports, show)).toEqual({ kind: 'home' });
    expect(shows).toEqual([]);

    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().session).toBeNull();
    expect(await openKeptLink(ports, show)).toEqual({ kind: 'ask', page: hidden });
    expect(shows).toEqual([ROUTE]);
  });

  it('is kept to ask later when it was tapped during the session', async () => {
    const { ports, linkKept } = await midSession();
    ports.shared.remove(SHARED_KEYS.clipLink);
    expect(linkKept()).toBeNull();

    expect(await openLink(ports, wild.id)).toEqual({ kind: 'home' });
    expect(linkKept()).toBe(ROUTE);
  });
});

describe('a thing sent from the page that asks, on a day that has turned to care', () => {
  it('is not taken in, and its link is still kept for another day', async () => {
    const { server, app, kept, ports, linkKept } = await phone();
    await app.say('Thinking about ending my life tonight', 'typed');
    expect(app.store.getState().today.kind).toBe('crisis');

    expect(await takeIn(ports, { ...wild, typed: null }, 'Book the dentist')).toBe(false);
    expect(server.asked).toHaveLength(0);
    expect(await kept.read()).toEqual([]);
    expect(linkKept()).toBe(ROUTE);
  });
});

describe('a link tapped again after its thing was set aside unpicked and let go', () => {
  it('takes the thing in again, and its kept link is dropped only then', async () => {
    const { server, app, ports, linkKept } = await phone();
    expect(await taken(await openLink(ports, wild.id))).toBe(true);
    const words = app.task().originalText;
    await app.store.dispatch({ type: 'task_set_aside' });
    const aside = app.store.getState().drawer.items.find((item) => item.text === words);
    await app.store.dispatch({ type: 'drawer_item_removed', itemId: aside?.id ?? '' });
    ports.shared.set(SHARED_KEYS.clipLink, LINK);

    expect(await taken(await openLink(ports, wild.id))).toBe(true);
    expect(server.asked).toHaveLength(2);
    expect(app.task().screen).toBe('pass');
    expect(linkKept()).toBeNull();
  });
});

describe('what the page that asks for the thing may promise', () => {
  it('is today only on a day with nothing set and a start left', async () => {
    const { app } = await phone();
    expect(takenOnToday(app.store.getState())).toBe(true);

    await app.say('Water the plants', 'typed');
    expect(takenOnToday(app.store.getState())).toBe(false);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    expect(takenOnToday(app.store.getState())).toBe(false);

    const idle = { taskCall: 'idle', pick: { kind: 'none' } } as const;
    expect(takenOnToday({ ...idle, today: { kind: 'nothing_yet', startsLeft: 0 } })).toBe(false);
    expect(takenOnToday({ ...idle, today: { kind: 'nothing_yet', startsLeft: 1 } })).toBe(true);
    expect(
      takenOnToday({ ...idle, taskCall: 'waiting', today: { kind: 'nothing_yet', startsLeft: 1 } }),
    ).toBe(false);
  });
});
