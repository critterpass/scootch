import { afterEach, describe, expect, it, vi } from 'vitest';

import { readCode } from '../src/accounts/codes';

import { as, inviteCode, ok, openTable, person, reasonOf, type Person } from './table-support';

afterEach(() => {
  vi.useRealTimers();
});

const classify = (who: Person, text: string) =>
  ok<{ kind: string; code: string | null }>(as(who, 'POST', '/v1/codes/classify', { text }));
const friendCode = async (from: Person) =>
  (await ok<{ code: string }>(as(from, 'POST', '/v1/friends/invites'))).code;

describe('a pasted code or link', () => {
  it('is read from a bare code, a link in either language, and a keyboard’s capitals', () => {
    expect(readCode('  abcdefgh23 ')).toBe('abcdefgh23');
    expect(readCode('Abcdefgh23')).toBe('abcdefgh23');
    expect(readCode('https://scootch.app/f/abcdefgh23')).toBe('abcdefgh23');
    expect(readCode('https://scootch.app/vi/t/abcdefgh23/?from=share#x')).toBe('abcdefgh23');
    expect(readCode('scootch-web-dev.bkdev98.workers.dev/t/abcdefgh23')).toBe('abcdefgh23');
    expect(readCode('scootch-dev://h/abcdefgh234567ab')).toBe('abcdefgh234567ab');
    for (const not of ['', 'hello', 'https://scootch.app/', 'abcdefgh2', 'abcdefgh18']) {
      expect(readCode(not)).toBeNull();
    }
  });

  it('is told apart as a table, a friend link or a haunt, and the answer holds nothing about its owner', async () => {
    const [owner, asker] = [await person('Mai'), await person('Bo')];
    const { tableId } = await openTable(owner);
    const table = await inviteCode(owner, tableId);
    const friend = await friendCode(owner);

    expect(await classify(asker, `https://scootch.app/t/${table}`)).toEqual({
      kind: 'table',
      code: table,
    });
    // The path is not believed: a friend code in a table link is still a friend code.
    expect(await classify(asker, `https://scootch.app/t/${friend}`)).toEqual({
      kind: 'friend',
      code: friend,
    });
    expect(await classify(asker, friend.toUpperCase())).toEqual({ kind: 'friend', code: friend });
    expect(await classify(asker, 'aaaaaaaaaa')).toEqual({ kind: 'unknown', code: null });
    expect(await classify(asker, 'not a code at all')).toEqual({ kind: 'unknown', code: null });

    const answers = JSON.stringify([await classify(asker, table), await classify(asker, friend)]);
    for (const secret of [owner.accountId, owner.name, tableId]) {
      expect(answers).not.toContain(secret);
    }
  });

  it('is unknown once it is used or has run out, exactly like a code nobody made', async () => {
    const [owner, asker] = [await person('Mai'), await person('Bo')];
    const used = await friendCode(owner);
    await ok(as(asker, 'POST', '/v1/friends/accept', { code: used }));
    const old = await friendCode(owner);
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 8 * 24 * 60 * 60 * 1000 });

    for (const code of [used, old]) {
      expect(await classify(asker, code)).toEqual({ kind: 'unknown', code: null });
    }
  });

  it('needs a registered device', async () => {
    expect((await as(undefined, 'POST', '/v1/codes/classify', { text: 'abcdefgh23' })).status).toBe(
      401,
    );
  });
});

describe('a friend code', () => {
  it('makes friends when it is pasted bare, in capitals, or as its link', async () => {
    const owner = await person('Mai');
    const [one, two, three] = [await person('Bo'), await person('Cy'), await person('Di')];

    await ok(as(one, 'POST', '/v1/friends/accept', { code: await friendCode(owner) }));
    await ok(
      as(two, 'POST', '/v1/friends/accept', { code: (await friendCode(owner)).toUpperCase() }),
    );
    await ok(
      as(three, 'POST', '/v1/friends/accept', {
        code: `https://scootch.app/vi/f/${await friendCode(owner)}`,
      }),
    );
    const { friends } = await ok<{ friends: unknown[] }>(as(owner, 'GET', '/v1/friends'));
    expect(friends).toHaveLength(3);
    expect(
      (await as(one, 'POST', '/v1/friends/accept', { code: 'nothing like a code' })).status,
    ).toBe(400);
  });

  it('has a page that says who it is from while it works, and names nobody once used', async () => {
    const [owner, taker] = [await person('Mai'), await person('Bo')];
    const code = await friendCode(owner);
    const page = () => as(undefined, 'GET', `/v1/friend-invite/${code}`);

    expect(await ok(page())).toEqual({ state: 'valid', fromName: 'Mai' });
    await ok(as(taker, 'POST', '/v1/friends/accept', { code }));
    expect(await ok(page())).toEqual({ state: 'gone', fromName: null });
    expect(await reasonOf(as(owner, 'POST', '/v1/friends/accept', { code }))).toBe(
      'invite_not_valid',
    );
    expect((await as(undefined, 'GET', '/v1/friend-invite/aaaaaaaaaa')).status).toBe(404);

    const old = await friendCode(owner);
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 8 * 24 * 60 * 60 * 1000 });
    expect(await ok(as(undefined, 'GET', `/v1/friend-invite/${old}`))).toEqual({
      state: 'gone',
      fromName: null,
    });
  });
});
