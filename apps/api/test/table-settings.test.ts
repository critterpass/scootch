import { describe, expect, it } from 'vitest';

import {
  as,
  befriend,
  count,
  inviteCode,
  ok,
  openTable,
  person,
  reasonOf,
  until,
} from './table-support';

describe('who can sit with you', () => {
  it('hides a table from friends and refuses a seat without a link, once its person takes nobody', async () => {
    const host = await person('Kofi');
    const friend = await person('Mai');
    await befriend(host, friend);
    const { tableId } = await openTable(host);
    expect((await ok<{ whoCanSit: string }>(as(host, 'GET', '/v1/accounts/me'))).whoCanSit).toBe(
      'friends',
    );

    expect(
      (await ok<{ whoCanSit: string }>(as(host, 'PUT', '/v1/accounts/me', { whoCanSit: 'nobody' })))
        .whoCanSit,
    ).toBe('nobody');
    expect(await ok(as(friend, 'GET', '/v1/friends/tables'))).toEqual({ tables: [] });
    expect(
      await reasonOf(as(friend, 'POST', `/v1/tables/${tableId}/join`, { purchase: 'free' })),
    ).toBe('friends_only');

    // A link the person sends still seats its holder: "nobody" is about sitting down unasked.
    const code = await inviteCode(host, tableId);
    await ok(as(friend, 'POST', '/v1/tables/join', { code, purchase: 'free' }));
    expect(await count('table_seats WHERE account_id = ?', friend.accountId)).toBe(1);
  });

  it('takes only the two answers it knows', async () => {
    const host = await person('Kofi');
    expect((await as(host, 'PUT', '/v1/accounts/me', { whoCanSit: 'anyone' })).status).toBe(400);
  });
});

describe('deleting the table account alone', () => {
  it('removes the account and everything social, and leaves the device registered', async () => {
    const leaver = await person('Mai');
    const friend = await person('Bo');
    await befriend(leaver, friend);
    const { tableId, seat } = await openTable(friend);
    await ok(as(leaver, 'POST', `/v1/tables/${tableId}/join`, { purchase: 'free' }));
    await until(() => seat.state.seats.length === 2, 'the seat to be taken');
    await ok(as(leaver, 'POST', '/v1/friends/invites'));

    expect(await ok(as(leaver, 'POST', '/v1/accounts/delete'))).toEqual({ deleted: true });

    expect(await count('accounts WHERE id = ?', leaver.accountId)).toBe(0);
    expect(
      await count('friendships WHERE account_a = ?1 OR account_b = ?1', leaver.accountId),
    ).toBe(0);
    expect(await count('friend_invites WHERE account_id = ?', leaver.accountId)).toBe(0);
    expect(await count('table_seats WHERE account_id = ?', leaver.accountId)).toBe(0);
    await until(() => seat.state.seats.length === 1, 'the seat to free');
    // The phone is still a registered device: only what needs an account is closed to it.
    expect(await count('devices WHERE token_hash = ?', leaver.deviceHash)).toBe(1);
    expect(await reasonOf(as(leaver, 'GET', '/v1/accounts/me'))).toBe('account_required');
    expect((await as(leaver, 'POST', '/v1/accounts/apple/nonce', {})).status).toBe(200);
    // Asked again, with no account left, it is not an error.
    expect(await ok(as(leaver, 'POST', '/v1/accounts/delete'))).toEqual({ deleted: true });
  });
});

describe('muted and blocked', () => {
  it('lists the caller’s own mutes and blocks, and never who has muted or blocked them', async () => {
    const me = await person('Mai');
    const loud = await person('Bo');
    const gone = await person('Zed');
    await ok(as(me, 'POST', '/v1/seats/mute', { accountId: loud.accountId, muted: true }));
    await ok(as(me, 'POST', '/v1/seats/block', { accountId: gone.accountId, blocked: true }));

    expect(await ok(as(me, 'GET', '/v1/seats/quieted'))).toEqual({
      muted: [{ accountId: loud.accountId, displayName: 'Bo' }],
      blocked: [{ accountId: gone.accountId, displayName: 'Zed' }],
    });
    expect(await ok(as(loud, 'GET', '/v1/seats/quieted'))).toEqual({ muted: [], blocked: [] });
    expect(await ok(as(gone, 'GET', '/v1/seats/quieted'))).toEqual({ muted: [], blocked: [] });

    await ok(as(me, 'POST', '/v1/seats/mute', { accountId: loud.accountId, muted: false }));
    await ok(as(me, 'POST', '/v1/seats/block', { accountId: gone.accountId, blocked: false }));
    expect(await ok(as(me, 'GET', '/v1/seats/quieted'))).toEqual({ muted: [], blocked: [] });
  });
});

describe('friend links that are waiting', () => {
  it('lists a link until it is opened or cancelled, and cancels only the caller’s own', async () => {
    const me = await person('Mai');
    const other = await person('Bo');
    const { code } = await ok<{ code: string }>(as(me, 'POST', '/v1/friends/invites'));
    const { invites } = await ok<{ invites: { id: string; expiresAt: string }[] }>(
      as(me, 'GET', '/v1/friends/invites'),
    );
    expect(invites).toHaveLength(1);
    const id = invites[0]?.id ?? '';
    // The id is not the code, and nothing in the list is.
    expect(JSON.stringify(invites)).not.toContain(code);
    expect(await ok(as(other, 'GET', '/v1/friends/invites'))).toEqual({ invites: [] });

    // Someone else cannot cancel it: it still works afterwards.
    await ok(as(other, 'DELETE', `/v1/friends/invites/${id}`));
    expect(await count('friend_invites WHERE account_id = ?', me.accountId)).toBe(1);

    expect(await ok(as(me, 'DELETE', `/v1/friends/invites/${id}`))).toEqual({ cancelled: true });
    expect(await ok(as(me, 'GET', '/v1/friends/invites'))).toEqual({ invites: [] });
    expect(await reasonOf(as(other, 'POST', '/v1/friends/accept', { code }))).toBe(
      'invite_not_valid',
    );
    expect((await as(me, 'DELETE', '/v1/friends/invites/not-an-id')).status).toBe(404);
  });

  it('drops a link from the list once it has made a friend', async () => {
    const me = await person('Mai');
    const other = await person('Bo');
    const { code } = await ok<{ code: string }>(as(me, 'POST', '/v1/friends/invites'));
    await ok(as(other, 'POST', '/v1/friends/accept', { code }));
    expect(await ok(as(me, 'GET', '/v1/friends/invites'))).toEqual({ invites: [] });
  });
});
