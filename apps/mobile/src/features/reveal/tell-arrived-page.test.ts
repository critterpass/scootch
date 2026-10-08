import { describe, expect, it } from '@jest/globals';

import { ApiClientError } from '../../api/api-error';
import type { HttpClient } from '../../api/http-client';
import { monsterPageFrom } from '../../api/monster-page-api';
import { createShareApi } from '../../api/share-api';
import { rememberPage } from '../arrive/arrive-rules';
import {
  arrivedMonsterKey,
  memoryKeptShares,
  monsterPageKey,
  type KeptShare,
} from '../share/kept-shares';

import { arrivedPageToTell, tellArrivedPageOfCatch } from './tell-arrived-page';

/** The monster's page on the website, as its read answers it. */
const page = monsterPageFrom({
  id: 'molar-7f3k9x',
  seed: 'dentist-seed',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  language: 'en',
  typed: 'Book the dentist before Thursday',
  status: 'wild',
});

/** A page this phone put up itself, for a monster of its own, with the token that takes it down. */
const own: KeptShare = {
  key: monsterPageKey('own-seed'),
  id: 'slime-222222',
  unshareToken: 'owner-token',
  language: 'en',
  taskShown: false,
};

/** The server at the network boundary: what was sent, headers included; `fails` is the call failing. */
function website(kept: readonly KeptShare[] = []) {
  const sent: { method: string; path: string; body: unknown; headers: unknown }[] = [];
  const server = { fails: false };
  const request: HttpClient['request'] = (method, path, body, parse, options) => {
    sent.push({ method, path, body, headers: options?.headers ?? {} });
    if (server.fails) {
      return Promise.reject(new ApiClientError('network', false, null, 'Unreachable'));
    }
    return Promise.resolve(parse({}));
  };
  const http: HttpClient = {
    request,
    post: (path, body, parse) => request('POST', path, body, parse),
  };
  return { sent, server, pages: { api: createShareApi(http), kept: memoryKeptShares(kept) } };
}

describe('the page a caught monster arrived from', () => {
  it('is told only for a monster that arrived from one, and only until it has been told', async () => {
    const kept = memoryKeptShares([own]);
    await rememberPage(kept, page);
    const shares = await kept.read();

    expect(arrivedPageToTell(shares, 'dentist-seed')).toMatchObject({ id: 'molar-7f3k9x' });
    // A monster made on this phone has no page it arrived from, even one this phone shared.
    expect(arrivedPageToTell(shares, 'own-seed')).toBeNull();
    expect(arrivedPageToTell(shares, 'a-monster-of-no-page')).toBeNull();
    expect(arrivedPageToTell([], 'dentist-seed')).toBeNull();
    const told = shares.map((one) => ({ ...one, caughtTold: true }));
    expect(arrivedPageToTell(told, 'dentist-seed')).toBeNull();
  });

  it('hears of the catch once, from this device and with no unshare token', async () => {
    const { sent, pages } = website([own]);
    await rememberPage(pages.kept, page);
    const caught = { seed: 'dentist-seed', catchMinutes: 7 };

    expect(await tellArrivedPageOfCatch(pages, { seed: 'own-seed', catchMinutes: 7 })).toBe(
      'nothing_to_tell',
    );
    expect(await tellArrivedPageOfCatch(pages, caught)).toBe('told');
    expect(await tellArrivedPageOfCatch(pages, caught)).toBe('nothing_to_tell');

    expect(sent).toEqual([
      {
        method: 'POST',
        path: '/v1/monster-page/molar-7f3k9x/caught',
        body: { catchMinutes: 7 },
        headers: {},
      },
    ]);
    expect(await pages.kept.read()).toEqual([
      own,
      {
        key: arrivedMonsterKey('dentist-seed'),
        id: 'molar-7f3k9x',
        unshareToken: '',
        language: 'en',
        taskShown: true,
        caughtTold: true,
      },
    ]);
  });

  it('stays untold when the call fails, and is told when it is tried again', async () => {
    const { sent, server, pages } = website();
    await rememberPage(pages.kept, page);
    const caught = { seed: 'dentist-seed', catchMinutes: 0 };

    server.fails = true;
    await expect(tellArrivedPageOfCatch(pages, caught)).rejects.toThrow();
    expect(arrivedPageToTell(await pages.kept.read(), 'dentist-seed')).not.toBeNull();

    server.fails = false;
    expect(await tellArrivedPageOfCatch(pages, caught)).toBe('told');
    // A catch is never said to have taken no time: the server takes one minute at the least.
    expect(sent.at(-1)).toMatchObject({ body: { catchMinutes: 1 } });
  });

  it('still sends the token for a page this phone shared', async () => {
    const { sent, pages } = website();
    await pages.api.monsterCaught('slime-222222', 'owner-token', 9);
    expect(sent).toMatchObject([{ headers: { 'X-Unshare-Token': 'owner-token' } }]);
  });
});
