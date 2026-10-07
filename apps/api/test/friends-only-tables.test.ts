import { describe, expect, it } from 'vitest';

import { wireErrorSchema } from '../src/contracts';

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
  type Person,
} from './table-support';

const people = (...names: string[]) => Promise.all(names.map((name) => person(name)));
const join = (who: Person, code: string, purchase = 'free') =>
  as(who, 'POST', '/v1/tables/join', { code, purchase });

describe('a table link that has leaked', () => {
  it('introduces as many new people as the table has seats beside its maker, then seats only friends', async () => {
    const [host, a, b, c, late, friend] = await people('Mai', 'Bo', 'Cy', 'Di', 'Eve', 'Flo');
    if (!host || !a || !b || !c || !late || !friend) throw new Error('no people');
    const { tableId, seat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    for (const guest of [a, b, c]) await ok(join(guest, code));
    // Two of them go, so seats are free again; the link has introduced its three.
    for (const guest of [b, c]) {
      (await connect(guest, tableId)).send({ type: 'leave' });
    }
    await until(() => seat.state.seats.length === 2, 'two seats to free');

    const refused = await join(late, code, 'yearly');
    expect(refused.status).toBe(400);
    expect(wireErrorSchema.parse(await refused.json()).error.detail).toEqual({
      reason: 'friends_only',
    });
    expect(await count('table_seats WHERE account_id = ?', late.accountId)).toBe(0);
    expect(await count('friendships WHERE account_a = ?1 OR account_b = ?1', late.accountId)).toBe(
      0,
    );

    // A friend of someone still seated, a guest included, sits down with the same link.
    await befriend(a, friend);
    expect(await ok(join(friend, code))).toMatchObject({ madeFriends: false });
    expect(
      await count('friendships WHERE account_a = ?1 OR account_b = ?1', friend.accountId),
    ).toBe(1);
  });

  it('gives an introduction back when the table turns out to be full', async () => {
    const [host, friend, stranger] = await people('Mai', 'Bo', 'Cy');
    if (!host || !friend || !stranger) throw new Error('no people');
    await befriend(host, friend);
    const { tableId } = await ok<{ tableId: string }>(
      as(host, 'POST', '/v1/tables', { purchase: 'free' }),
    );
    const code = await inviteCode(host, tableId);
    await ok(join(friend, code));

    expect(await reasonOf(join(stranger, code))).toBe('table_full');
    expect(
      await count('friendships WHERE account_a = ?1 OR account_b = ?1', stranger.accountId),
    ).toBe(0);
    expect(
      await count('table_invites WHERE table_id = ? AND introductions_left = 1', tableId),
    ).toBe(1);
  });

  it('seats nobody its maker has blocked, with the answer an unknown code gets', async () => {
    const [host, blocked] = await people('Mai', 'Bo');
    if (!host || !blocked) throw new Error('no people');
    const { tableId, seat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    await ok(as(host, 'POST', '/v1/seats/block', { accountId: blocked.accountId, blocked: true }));
    seat.send({ type: 'leave' });
    await until(() => seat.closed !== undefined, 'the host to leave');

    expect(await reasonOf(join(blocked, code))).toBe('invite_not_valid');
    expect(await reasonOf(join(blocked, 'aaaaaaaaaa'))).toBe('invite_not_valid');
  });
});

describe('friends’ tables', () => {
  it('lists the open tables a friend is at with a free seat, naming only the caller’s friends, and seats the caller in one call', async () => {
    const [host, guest, me, stranger] = await people('Kofi', 'Dana', 'Mai', 'Zed');
    if (!host || !guest || !me || !stranger) throw new Error('no people');
    await befriend(host, me);
    const { tableId } = await openTable(host);
    await ok(join(guest, await inviteCode(host, tableId)));

    expect(await ok(as(me, 'GET', '/v1/friends/tables'))).toEqual({
      tables: [
        {
          tableId,
          capacity: 4,
          seatsTaken: 2,
          friends: [{ accountId: host.accountId, displayName: 'Kofi' }],
        },
      ],
    });
    expect(await ok(as(stranger, 'GET', '/v1/friends/tables'))).toEqual({ tables: [] });
    expect(
      await reasonOf(as(stranger, 'POST', `/v1/tables/${tableId}/join`, { purchase: 'yearly' })),
    ).toBe('friends_only');
    // A table that does not exist answers the same.
    expect(
      await reasonOf(
        as(stranger, 'POST', '/v1/tables/aaaaaaaaaaaaaaaa/join', { purchase: 'yearly' }),
      ),
    ).toBe('friends_only');

    expect(await ok(as(me, 'POST', `/v1/tables/${tableId}/join`, { purchase: 'free' }))).toEqual({
      tableId,
      capacity: 4,
      madeFriends: false,
    });
    expect(await ok(as(me, 'GET', '/v1/friends/tables'))).toEqual({ tables: [] });
  });

  it('leaves out a full table and one holding someone on either side of a block', async () => {
    const [host, friend, me, other, ann] = await people('Kofi', 'Dana', 'Mai', 'Zed', 'Ann');
    if (!host || !friend || !me || !other || !ann) throw new Error('no people');
    await befriend(host, me);
    await befriend(host, friend);
    const small = await ok<{ tableId: string }>(
      as(host, 'POST', '/v1/tables', { purchase: 'free' }),
    );
    await ok(join(friend, await inviteCode(host, small.tableId)));
    expect(await ok(as(me, 'GET', '/v1/friends/tables'))).toEqual({ tables: [] });

    await befriend(other, me);
    const { tableId } = await openTable(other);
    await ok(join(ann, await inviteCode(other, tableId)));
    await ok(as(ann, 'POST', '/v1/seats/block', { accountId: me.accountId, blocked: true }));
    expect(await ok(as(me, 'GET', '/v1/friends/tables'))).toEqual({ tables: [] });
  });
});
