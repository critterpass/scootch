import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { jevChoice, providers, type Reply } from './ai-providers';
import { botEnv, telegram } from './bot-support';
import {
  as,
  befriend,
  count,
  inviteCode,
  ok,
  openTable,
  person,
  reasonOf,
  sitDown,
  until,
} from './table-support';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('delete everything, with an account', () => {
  it('removes the account, its seat, friendships, mutes, blocks and haunts, and unlinks its reports', async () => {
    vi.stubGlobal('fetch', telegram().fetch);
    const leaver = await person('Mai');
    const friend = await person('Bo');
    const other = await person('Cy');
    await befriend(leaver, friend);
    await befriend(friend, other);
    const { tableId, seat: leaverSeat } = await openTable(leaver);
    const code = await inviteCode(leaver, tableId);
    const friendSeat = await sitDown(friend, code, tableId);
    await ok(as(leaver, 'POST', '/v1/friends/invites'));
    await ok(as(leaver, 'POST', '/v1/seats/mute', { accountId: friend.accountId, muted: true }));
    await ok(as(friend, 'POST', '/v1/seats/mute', { accountId: leaver.accountId, muted: true }));
    await ok(as(leaver, 'POST', '/v1/seats/block', { accountId: other.accountId, blocked: true }));
    await ok(
      as(
        leaver,
        'POST',
        '/v1/seats/report',
        { tableId, accountId: friend.accountId, reason: 'something_else' },
        botEnv(),
      ),
    );
    const haunt = { bodyType: 'sock', seed: 'a1b2c3d4e5f6', dare: 'tiny_bit', screen: 'pass' };
    await ok(as(leaver, 'POST', '/v1/haunts', { ...haunt, to: friend.accountId }));
    await ok(as(friend, 'POST', '/v1/haunts', { ...haunt, to: leaver.accountId }));

    await ok(as(leaver, 'POST', '/v1/data-delete', {}));

    const id = leaver.accountId;
    expect(await count('accounts WHERE id = ?', id)).toBe(0);
    expect(await count('account_devices WHERE account_id = ?', id)).toBe(0);
    expect(await count('devices WHERE token_hash = ?', leaver.deviceHash)).toBe(0);
    expect(await count('friendships WHERE account_a = ?1 OR account_b = ?1', id)).toBe(0);
    expect(await count('friend_invites WHERE account_id = ?', id)).toBe(0);
    expect(await count('mutes WHERE muter = ?1 OR muted = ?1', id)).toBe(0);
    expect(await count('blocks WHERE blocker = ?1 OR blocked = ?1', id)).toBe(0);
    expect(await count('haunts WHERE sender = ?1 OR recipient = ?1', id)).toBe(0);
    expect(await count('table_seats WHERE account_id = ?', id)).toBe(0);
    expect(await count('table_invites WHERE created_by = ?', id)).toBe(0);
    // The report about someone else stays, tied to nobody.
    expect(await count('reports WHERE reported = ? AND reporter IS NULL', friend.accountId)).toBe(
      1,
    );
    expect(await count('reports WHERE reporter = ?', id)).toBe(0);

    // The table saw them go, and the people who remain keep what is theirs.
    await until(() => leaverSeat.closed !== undefined, 'the seat to close');
    await until(() => friendSeat.state.seats.length === 1, 'the seat to empty');
    expect(friendSeat.state.hostId).toBe(friend.accountId);
    expect(await count('accounts WHERE id IN (?, ?)', friend.accountId, other.accountId)).toBe(2);
    expect(await count('friendships WHERE account_a = ?1 OR account_b = ?1', other.accountId)).toBe(
      1,
    );
  });
});

/** Jev answering the screen's three questions and the name question. */
function judging(
  name: { acceptable: number },
  care = { pass: 0.98, serious: 0.01, crisis: 0.01 },
): Reply {
  return (request) => {
    const sent = JSON.stringify(request.body);
    if (/unacceptable/.test(sent)) {
      return jevChoice({ acceptable: name.acceptable, unacceptable: 1 - name.acceptable })(request);
    }
    if (/crisis/.test(sent)) return jevChoice(care)(request);
    if (/misuse/.test(sent)) return jevChoice({ genuine: 0.99, misuse: 0.01 })(request);
    return jevChoice({ no: 0.99, yes: 0.01 })(request);
  };
}

describe('the display name', () => {
  const keys = { ...env, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' };
  const never: Reply = () => {
    throw new Error('the fallback was not expected');
  };
  const rename = async (displayName: string, jev: Reply) => {
    const doubles = providers({ jev, deepseek: never });
    vi.stubGlobal('fetch', doubles.fetch);
    const who = await person('Mai');
    return {
      who,
      doubles,
      response: await as(who, 'PUT', '/v1/accounts/me', { displayName }, keys),
    };
  };

  it('is kept, trimmed, once the screen and the name question both accept it', async () => {
    const { who, doubles, response } = await rename('  Khánh   Q ', judging({ acceptable: 0.97 }));

    expect(await ok(response)).toMatchObject({ displayName: 'Khánh Q' });
    expect(doubles.sent.jev).toHaveLength(4);
    expect(
      await count("ai_usage WHERE route = 'table.name' AND device_hash = ?", who.deviceHash),
    ).toBe(4);
  });

  it.each([
    ['the name question finds it unacceptable', judging({ acceptable: 0.1 })],
    ['the name question is unsure', judging({ acceptable: 0.6 })],
    [
      'the care screen does not pass it',
      judging({ acceptable: 0.97 }, { pass: 0.2, serious: 0.75, crisis: 0.05 }),
    ],
  ])('is refused when %s', async (_case, jev) => {
    const { who, response } = await rename('Some Name', jev);

    expect(await reasonOf(response)).toBe('name_not_acceptable');
    expect(await ok(as(who, 'GET', '/v1/accounts/me'))).toMatchObject({ displayName: 'Mai' });
  });

  it('is not kept when no model could check it', async () => {
    const { who, response } = await rename('Some Name', () => Response.json({}, { status: 500 }));

    expect(response.status).toBe(503);
    expect(await ok(as(who, 'GET', '/v1/accounts/me'))).toMatchObject({ displayName: 'Mai' });
  });

  it.each(['A', 'x'.repeat(21), 'bell\u0007char', 'zero​width'])(
    'must be 2 to 20 plain characters: %j',
    async (name) => {
      const { doubles, response } = await rename(name, judging({ acceptable: 0.97 }));

      expect(await reasonOf(response)).toBe('name_not_acceptable');
      expect(doubles.sent.jev).toHaveLength(0);
    },
  );
});
