import { describe, expect, it } from '@jest/globals';

import { monsterPageFrom, type MonsterPage } from '../../api/monster-page-api';
import { ApiClientError } from '../../api/api-error';
import {
  KEPT_ARRIVALS_LIMIT,
  KEPT_SHARES_LIMIT,
  arrivedMonsterKey,
  memoryKeptShares,
  monsterPageKey,
} from '../share/kept-shares';
import { SHARED_KEYS, type SharedStore } from '../surfaces/surface-ports';

import {
  arrivalFor,
  dropKeptLink,
  holdLink,
  isNoSuchPage,
  keptLink,
  linkMayOpen,
  linkScreenFor,
  monsterRouteOf,
  pageIdFrom,
  rememberPage,
  sessionIsUp,
} from './arrive-rules';

/** A monster's page as `GET /v1/monster-page/:id` answers it. */
const ANSWER = {
  id: 'molar-7f3k9x',
  seed: 'dentist-seed',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  language: 'en',
  typed: 'Book the dentist before Thursday',
  status: 'wild',
  caughtAt: null,
  catchMinutes: null,
  sharedAt: '2026-10-08T10:00:00.000Z',
  signature: 'signed',
};
const wild: MonsterPage = monsterPageFrom(ANSWER);
const ORDINARY = { crisis: false, heavy: false };

function sharedStore(
  values: Record<string, string>,
): SharedStore & { values: Map<string, string> } {
  const kept = new Map(Object.entries(values));
  return {
    values: kept,
    get: (key) => kept.get(key) ?? null,
    set: (key, value) => void kept.set(key, value),
    remove: (key) => void kept.delete(key),
    reloadSurfaces: () => undefined,
  };
}

describe("opening a monster's link", () => {
  it('takes in the thing of a wild monster whose page shows its words', () => {
    expect(arrivalFor(wild, ORDINARY)).toEqual({
      kind: 'take_in',
      page: wild,
      text: 'Book the dentist before Thursday',
    });
  });

  it('asks for the thing when the page hides its words', () => {
    const hidden = { ...wild, typed: null };
    expect(arrivalFor(hidden, ORDINARY)).toEqual({ kind: 'ask', page: hidden });
    expect(arrivalFor({ ...wild, typed: '   ' }, ORDINARY).kind).toBe('ask');
  });

  it('shows home and nothing else for a caught monster, an unknown id or an unread page', () => {
    expect(arrivalFor({ ...wild, status: 'caught' }, ORDINARY)).toEqual({ kind: 'home' });
    expect(arrivalFor({ ...wild, status: 'caught', typed: null }, ORDINARY)).toEqual({
      kind: 'home',
    });
    expect(arrivalFor(null, ORDINARY)).toEqual({ kind: 'home' });
  });

  it('takes nothing in on a crisis day, and shows no card beside something heavy', () => {
    expect(arrivalFor(wild, { crisis: true, heavy: false })).toEqual({ kind: 'home' });
    expect(arrivalFor({ ...wild, typed: null }, { crisis: true, heavy: false })).toEqual({
      kind: 'home',
    });
    expect(arrivalFor({ ...wild, typed: null }, { crisis: false, heavy: true })).toEqual({
      kind: 'home',
    });
    // Words that are shown are still taken in on a heavy day, where the day's own rules place them.
    expect(arrivalFor(wild, { crisis: false, heavy: true }).kind).toBe('take_in');
  });

  it('reads only a whole monster page from the server', () => {
    expect(wild).toEqual({
      id: 'molar-7f3k9x',
      seed: 'dentist-seed',
      bodyType: 'tooth',
      name: 'Molar, Keeper of Thursday',
      flavourText: 'Lives in the inbox. Pays no rent.',
      language: 'en',
      typed: 'Book the dentist before Thursday',
      status: 'wild',
    });
    expect(() => monsterPageFrom({ ...ANSWER, bodyType: 'dragon-of-no-registry' })).toThrow();
    expect(() => monsterPageFrom({ ...ANSWER, status: 'gone' })).toThrow();
    expect(() => monsterPageFrom({ ...ANSWER, seed: '' })).toThrow();
    expect(() => monsterPageFrom({ error: { code: 'not_found' } })).toThrow();
  });
});

describe('the screen a monster’s link is opened on', () => {
  const hidden = { ...wild, typed: null };
  const asks = { kind: 'ask', page: hidden } as const;

  it('says it is opening until the link has been opened, and leaves for home', () => {
    expect(linkScreenFor(null, ORDINARY)).toBe('opening');
    expect(linkScreenFor(null, { crisis: true, heavy: true })).toBe('opening');
    expect(linkScreenFor({ kind: 'home' }, ORDINARY)).toBe('leave');
  });

  it('asks for the thing only while the day is neither heavy nor a crisis', () => {
    expect(linkScreenFor(asks, ORDINARY)).toBe('ask');
    // The day turned while the card was up (an answer came back serious, or as a crisis).
    expect(linkScreenFor(asks, { crisis: false, heavy: true })).toBe('leave');
    expect(linkScreenFor(asks, { crisis: true, heavy: false })).toBe('leave');
    expect(linkScreenFor(asks, { crisis: true, heavy: true })).toBe('leave');
  });

  it('is never put over a session whose screens are up', () => {
    for (const phase of ['running', 'stuck', 'holding', 'time_up', 'finished', 'not_finished']) {
      expect(sessionIsUp({ phase })).toBe(true);
    }
    expect(sessionIsUp(null)).toBe(false);
    expect(sessionIsUp({ phase: 'set' })).toBe(false);
    expect(sessionIsUp({ phase: 'left_early' })).toBe(false);
  });
});

describe("the link a monster's page is opened by", () => {
  it('is the same route from the site in either language and from the app’s scheme', () => {
    expect(monsterRouteOf('https://scootch.app/m/molar-7f3k9x')).toBe('/m/molar-7f3k9x');
    expect(monsterRouteOf('https://scootch.app/vi/m/molar-7f3k9x')).toBe('/m/molar-7f3k9x');
    expect(monsterRouteOf('https://dev.scootch.app/m/molar-7f3k9x?ref=clip#top')).toBe(
      '/m/molar-7f3k9x',
    );
    expect(monsterRouteOf('scootch://m/molar-7f3k9x')).toBe('/m/molar-7f3k9x');
    expect(monsterRouteOf('scootch-dev://vi/m/molar-7f3k9x/')).toBe('/m/molar-7f3k9x');
  });

  it('is no route for any other link', () => {
    expect(monsterRouteOf('https://scootch.app/t/ABCD')).toBeNull();
    expect(monsterRouteOf('https://scootch.app/get')).toBeNull();
    expect(monsterRouteOf('https://scootch.app/m/')).toBeNull();
    expect(monsterRouteOf('https://scootch.app/m/one/two')).toBeNull();
    expect(monsterRouteOf('https://scootch.app/m/..%2Fsettings')).toBeNull();
    expect(monsterRouteOf('not a link')).toBeNull();
    expect(pageIdFrom('../settings')).toBeNull();
    expect(pageIdFrom(undefined)).toBeNull();
  });
});

describe('the link that is kept until it can be opened', () => {
  const NOW = Date.parse('2026-10-08T10:00:00.000Z');
  const DAY = 24 * 60 * 60 * 1000;
  const keptAt = (instant: number) => String(instant / 1000);

  it('is read without being cleared, so a launch with no connection does not lose it', () => {
    const shared = sharedStore({
      [SHARED_KEYS.clipLink]: 'https://scootch.app/vi/m/molar-7f3k9x',
      [SHARED_KEYS.clipLinkStoredAt]: keptAt(NOW - 60_000),
      [SHARED_KEYS.snapshot]: '{}',
    });
    expect(keptLink(shared, NOW)).toBe('/m/molar-7f3k9x');
    expect(keptLink(shared, NOW)).toBe('/m/molar-7f3k9x');
    expect(shared.values.size).toBe(3);
  });

  it('is dropped by the link it is, and by no other', () => {
    const shared = sharedStore({
      [SHARED_KEYS.clipLink]: 'https://scootch.app/m/molar-7f3k9x',
      [SHARED_KEYS.clipLinkStoredAt]: keptAt(NOW),
      [SHARED_KEYS.snapshot]: '{}',
    });
    dropKeptLink(shared, '/m/slime-222222');
    expect(keptLink(shared, NOW)).toBe('/m/molar-7f3k9x');
    dropKeptLink(shared, '/m/molar-7f3k9x');
    expect([...shared.values.keys()]).toEqual([SHARED_KEYS.snapshot]);
  });

  it('is dropped unopened after seven days, and kept on the seventh', () => {
    const shared = sharedStore({
      [SHARED_KEYS.clipLink]: 'https://scootch.app/m/molar-7f3k9x',
      [SHARED_KEYS.clipLinkStoredAt]: keptAt(NOW - 7 * DAY),
    });
    expect(keptLink(shared, NOW)).toBe('/m/molar-7f3k9x');
    expect(keptLink(shared, NOW + 1000)).toBeNull();
    expect(shared.values.size).toBe(0);
  });

  it('is counted from now when the clip kept no time with it', () => {
    const shared = sharedStore({ [SHARED_KEYS.clipLink]: 'https://scootch.app/m/molar-7f3k9x' });
    expect(keptLink(shared, NOW)).toBe('/m/molar-7f3k9x');
    expect(keptLink(shared, NOW + 7 * DAY)).toBe('/m/molar-7f3k9x');
    expect(keptLink(shared, NOW + 7 * DAY + 1000)).toBeNull();
  });

  it('is dropped and opens nothing when it is not a monster’s', () => {
    const shared = sharedStore({
      [SHARED_KEYS.clipLink]: 'https://scootch.app/get',
      [SHARED_KEYS.clipLinkStoredAt]: keptAt(NOW),
    });
    expect(keptLink(shared, NOW)).toBeNull();
    expect(shared.values.size).toBe(0);
  });

  it('opens nothing when the App Group cannot be read', () => {
    const broken: SharedStore = {
      get: () => {
        throw new Error('no App Group');
      },
      set: () => undefined,
      remove: () => undefined,
      reloadSurfaces: () => undefined,
    };
    expect(keptLink(broken, NOW)).toBeNull();
    expect(() => dropKeptLink(broken)).not.toThrow();
    expect(() => holdLink(broken, '/m/molar-7f3k9x', NOW)).not.toThrow();
  });

  it('keeps a link that has to wait where the clip keeps its own', () => {
    const shared = sharedStore({});
    holdLink(shared, '/m/molar-7f3k9x', NOW);
    expect(keptLink(shared, NOW + DAY)).toBe('/m/molar-7f3k9x');
    // Held again later, it keeps the time it was first kept.
    holdLink(shared, '/m/molar-7f3k9x', NOW + 6 * DAY);
    expect(keptLink(shared, NOW + 7 * DAY + 1000)).toBeNull();
  });

  it('waits for first launch, for a restore offer and for a crisis day to be over', () => {
    const ready = {
      ready: true,
      settings: { firstLaunchDoneAt: '2026-10-01T09:00:00.000Z' },
      today: { kind: 'nothing_yet' },
    };
    expect(linkMayOpen(ready, false)).toBe(true);
    expect(linkMayOpen({ ...ready, settings: { firstLaunchDoneAt: null } }, false)).toBe(false);
    expect(linkMayOpen(ready, true)).toBe(false);
    expect(linkMayOpen({ ...ready, today: { kind: 'crisis' } }, false)).toBe(false);
    expect(linkMayOpen({ ...ready, ready: false }, false)).toBe(false);
  });

  it('tells a page nobody has from a page that could not be reached', () => {
    expect(isNoSuchPage(new ApiClientError('not_found', false, 404, 'No such page'))).toBe(true);
    expect(isNoSuchPage(new ApiClientError('network', false, null, 'Unreachable'))).toBe(false);
    expect(isNoSuchPage(new ApiClientError('timeout', false, null, 'Too slow'))).toBe(false);
    expect(isNoSuchPage(new ApiClientError('internal', true, 503, 'Down'))).toBe(false);
  });
});

describe('the page a monster arrived from', () => {
  it('is remembered by the monster’s seed, beside the pages this phone shared', async () => {
    const own = {
      key: 'monster:other-seed',
      id: 'slime-222222',
      unshareToken: 'token',
      language: 'en',
      taskShown: false,
    } as const;
    const kept = memoryKeptShares([own]);
    await rememberPage(kept, wild);
    await rememberPage(kept, wild);

    expect(await kept.read()).toEqual([
      own,
      {
        key: arrivedMonsterKey('dentist-seed'),
        id: 'molar-7f3k9x',
        unshareToken: '',
        language: 'en',
        taskShown: true,
      },
    ]);
  });
  it('never pushes out a page this phone shared, however many monsters arrive', async () => {
    const own = Array.from({ length: KEPT_SHARES_LIMIT }, (_, index) => ({
      key: monsterPageKey(`own-${index}`),
      id: `own-page-${index}`,
      unshareToken: `token-${index}`,
      language: 'en' as const,
      taskShown: false,
    }));
    const kept = memoryKeptShares(own);
    for (let index = 0; index < KEPT_ARRIVALS_LIMIT + 10; index += 1) {
      await rememberPage(kept, { ...wild, id: `page-${index}`, seed: `seed-${index}` });
    }

    const after = await kept.read();
    expect(after.filter((one) => one.unshareToken !== '')).toEqual(own);
    const arrived = after.filter((one) => one.unshareToken === '');
    expect(arrived).toHaveLength(KEPT_ARRIVALS_LIMIT);
    expect(arrived[0]?.id).toBe('page-10');
    expect(arrived.at(-1)?.id).toBe(`page-${KEPT_ARRIVALS_LIMIT + 9}`);
  });
});
