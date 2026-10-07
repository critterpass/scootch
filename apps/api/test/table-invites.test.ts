import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  as,
  befriend,
  connect,
  count,
  inviteCode,
  ok,
  openTable,
  person,
  reasonOf,
  until,
} from './table-support';
import { wireErrorSchema } from '../src/contracts';

const day = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

describe('opening a table', () => {
  it('is open to anyone signed in: two seats without Plus, four with it, judged from the purchase state the phone reports', async () => {
    const host = await person('Mai');

    for (const purchase of ['free', 'expired', 'refunded', 'friend_pass_guest']) {
      const opened = await ok<{ tableId: string; capacity: number }>(
        as(host, 'POST', '/v1/tables', { purchase }),
      );
      expect(opened.capacity).toBe(2);
      expect(await count('tables WHERE id = ? AND capacity = 2', opened.tableId)).toBe(1);
    }
    expect(await ok(as(host, 'POST', '/v1/tables', { purchase: 'trial' }))).toMatchObject({
      capacity: 4,
    });
  });

  it('seats one friend at a table opened without Plus, refuses a third person, and tells every seat the capacity', async () => {
    const [host, friend, third] = await Promise.all(['Mai', 'Bo', 'Cy'].map((n) => person(n)));
    if (!host || !friend || !third) throw new Error('no people');
    await befriend(host, friend);
    await befriend(host, third);
    const { tableId } = await ok<{ tableId: string }>(
      as(host, 'POST', '/v1/tables', { purchase: 'free' }),
    );
    const seat = await connect(host, tableId);
    const code = await inviteCode(host, tableId);

    expect(await ok(as(friend, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toEqual({
      tableId,
      capacity: 2,
      madeFriends: false,
    });
    // Plus of the joiner's own does not make the table bigger.
    const refused = await as(third, 'POST', '/v1/tables/join', { code, purchase: 'yearly' });
    expect(refused.status).toBe(400);
    expect(wireErrorSchema.parse(await refused.json()).error).toMatchObject({
      code: 'bad_request',
      retryable: false,
      detail: { reason: 'table_full' },
    });
    await until(() => seat.state.seats.length === 2, 'two seats');
    expect(seat.state.capacity).toBe(2);
    expect(await count('table_seats WHERE table_id = ?', tableId)).toBe(2);
  });

  it('needs an account with a name, and a device with no account is told to sign in', async () => {
    const nameless = await person('Mai');
    await env.DB.prepare('UPDATE accounts SET display_name = NULL WHERE id = ?')
      .bind(nameless.accountId)
      .run();
    const { token } = await ok<{ token: string }>(
      as(undefined, 'POST', '/v1/devices', { language: 'en' }),
    );

    expect(await reasonOf(as(nameless, 'POST', '/v1/tables', { purchase: 'yearly' }))).toBe(
      'name_required',
    );
    expect(await reasonOf(as({ token }, 'POST', '/v1/tables', { purchase: 'yearly' }))).toBe(
      'account_required',
    );
  });
});

describe('invite links', () => {
  it('seat a friend, and make a friend of someone the host gave the link to', async () => {
    const host = await person('Mai');
    const friend = await person('Bo');
    const stranger = await person('Cy');
    await befriend(host, friend);
    const { tableId, seat } = await openTable(host);
    const code = await inviteCode(host, tableId);

    expect(
      await ok(as(friend, 'POST', '/v1/tables/join', { code, purchase: 'free' })),
    ).toMatchObject({ madeFriends: false });
    // The link is the host's word for its holder: sitting down makes the two friends.
    expect(
      await ok(as(stranger, 'POST', '/v1/tables/join', { code, purchase: 'free' })),
    ).toMatchObject({ madeFriends: true });
    expect(await ok(as(stranger, 'GET', '/v1/friends'))).toEqual({
      friends: [{ accountId: host.accountId, displayName: 'Mai', canBeHaunted: true }],
    });

    const strangerSeat = await connect(stranger, tableId);
    await until(() => seat.state.seats.length === 3, 'three seats');
    expect(strangerSeat.state.you).toBe(stranger.accountId);
  });

  it('expire after 24 hours', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId } = await openTable(host);
    const code = await inviteCode(host, tableId);

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + day + 1000 });

    expect(await reasonOf(as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toBe(
      'invite_not_valid',
    );
  });

  it('are single purpose: a table code makes no friends and a friend code seats nobody', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId } = await openTable(host);
    const tableCode = await inviteCode(host, tableId);
    const friendCode = (await ok<{ code: string }>(as(host, 'POST', '/v1/friends/invites'))).code;

    expect(await reasonOf(as(guest, 'POST', '/v1/friends/accept', { code: tableCode }))).toBe(
      'invite_not_valid',
    );
    expect(
      await reasonOf(as(guest, 'POST', '/v1/tables/join', { code: friendCode, purchase: 'free' })),
    ).toBe('invite_not_valid');
    expect(await count('friendships WHERE account_a = ?1 OR account_b = ?1', guest.accountId)).toBe(
      0,
    );
    expect(await count('table_seats WHERE table_id = ?', tableId)).toBe(1);
  });

  it('can only be made by someone seated at the table', async () => {
    const host = await person('Mai');
    const outsider = await person('Bo');
    const { tableId } = await openTable(host);

    expect(await reasonOf(as(outsider, 'POST', `/v1/tables/${tableId}/invites`))).toBe(
      'not_at_table',
    );
  });

  it('let the host’s friend pass cover three free guests and no more', async () => {
    const host = await person('Mai');
    const guests = await Promise.all(['Bo', 'Cy', 'Di'].map((name) => person(name)));
    const fourthFree = await person('Eve');
    const withPlus = await person('Flo');
    await befriend(host, fourthFree);
    await befriend(host, withPlus);
    const { tableId, seat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    for (const guest of guests)
      await ok(as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free' }));

    // The host goes; their pass still covers the three, and a seat is free.
    seat.send({ type: 'leave' });
    await until(() => seat.closed !== undefined, 'the host to leave');

    expect(
      await reasonOf(as(fourthFree, 'POST', '/v1/tables/join', { code, purchase: 'free' })),
    ).toBe('pass_full');
    await ok(as(withPlus, 'POST', '/v1/tables/join', { code, purchase: 'monthly' }));
    expect(await count('table_seats WHERE table_id = ?', tableId)).toBe(4);
  });
});

describe('friend links', () => {
  it('make two accounts friends once, expire, and either friend can end it', async () => {
    const one = await person('Mai');
    const two = await person('Bo');
    const three = await person('Cy');
    const { code } = await ok<{ code: string }>(as(one, 'POST', '/v1/friends/invites'));

    expect(await reasonOf(as(one, 'POST', '/v1/friends/accept', { code }))).toBe(
      'invite_not_valid',
    );
    await ok(as(two, 'POST', '/v1/friends/accept', { code }));
    expect(await reasonOf(as(three, 'POST', '/v1/friends/accept', { code }))).toBe(
      'invite_not_valid',
    );
    expect(await ok(as(one, 'GET', '/v1/friends'))).toEqual({
      friends: [{ accountId: two.accountId, displayName: 'Bo', canBeHaunted: true }],
    });

    await ok(as(two, 'DELETE', `/v1/friends/${one.accountId}`));
    expect(await ok(as(one, 'GET', '/v1/friends'))).toEqual({ friends: [] });

    const later = (await ok<{ code: string }>(as(one, 'POST', '/v1/friends/invites'))).code;
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 8 * day });
    expect(await reasonOf(as(two, 'POST', '/v1/friends/accept', { code: later }))).toBe(
      'invite_not_valid',
    );
  });

  it('do not work across a block, and blocking ends the friendship', async () => {
    const one = await person('Mai');
    const two = await person('Bo');
    await befriend(one, two);

    await ok(as(one, 'POST', '/v1/seats/block', { accountId: two.accountId, blocked: true }));

    expect(await count('friendships WHERE account_a = ?1 OR account_b = ?1', one.accountId)).toBe(
      0,
    );
    const { code } = await ok<{ code: string }>(as(one, 'POST', '/v1/friends/invites'));
    expect(await reasonOf(as(two, 'POST', '/v1/friends/accept', { code }))).toBe(
      'invite_not_valid',
    );
  });
});
