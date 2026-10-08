import { describe, expect, it } from '@jest/globals';

import { monsterPageFrom, type MonsterPage } from '../../api/monster-page-api';
import { arrivedMonsterKey, memoryKeptShares } from '../share/kept-shares';
import { SHARED_KEYS, type SharedStore } from '../surfaces/surface-ports';

import { arrivalFor, monsterRouteOf, pageIdFrom, rememberPage, takeClipLink } from './arrive-rules';

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

describe('the link the App Clip kept', () => {
  it('is taken once and cleared, with the time it was kept', () => {
    const shared = sharedStore({
      [SHARED_KEYS.clipLink]: 'https://scootch.app/vi/m/molar-7f3k9x',
      [SHARED_KEYS.clipLinkStoredAt]: '1791456000',
      [SHARED_KEYS.snapshot]: '{}',
    });
    expect(takeClipLink(shared)).toBe('/m/molar-7f3k9x');
    expect([...shared.values.keys()]).toEqual([SHARED_KEYS.snapshot]);
    expect(takeClipLink(shared)).toBeNull();
  });

  it('is cleared and opens nothing when it is not a monster’s', () => {
    const shared = sharedStore({ [SHARED_KEYS.clipLink]: 'https://scootch.app/get' });
    expect(takeClipLink(shared)).toBeNull();
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
    expect(takeClipLink(broken)).toBeNull();
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
});
