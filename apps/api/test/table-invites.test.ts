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

const day = 24 * 60 * 60 * 1000;

afterEach(async () => {
  vi.useRealTimers();
  await env.DB.prepare('DELETE FROM flags').run();
});

describe('opening a table', () => {
  it('is Plus only while tables.requirePlus is on, judged from the purchase state the phone reports', async () => {
    const host = await person('Mai');

    for (const purchase of ['free', 'expired', 'refunded', 'friend_pass_guest']) {
      expect(await reasonOf(as(host, 'POST', '/v1/tables', { purchase }))).toBe('plus_required');
    }
    expect((await as(host, 'POST', '/v1/tables', { purchase: 'trial' })).status).toBe(200);

    await env.DB.prepare('INSERT INTO flags (name, "on") VALUES (?, 0)')
      .bind('tables.requirePlus')
      .run();
    expect((await as(host, 'POST', '/v1/tables', { purchase: 'free' })).status).toBe(200);
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
  it('seat a friend, and a stranger the link was forwarded to', async () => {
    const host = await person('Mai');
    const friend = await person('Bo');
    const stranger = await person('Cy');
    await befriend(host, friend);
    const { tableId, seat } = await openTable(host);
    const code = await inviteCode(host, tableId);

    await ok(as(friend, 'POST', '/v1/tables/join', { code, purchase: 'free' }));
    await ok(as(stranger, 'POST', '/v1/tables/join', { code, purchase: 'free' }));

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
