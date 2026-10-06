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
  sitDown,
  until,
  upgrade,
} from './table-support';

describe('signing out', () => {
  it('ends the account session for this device: the token opens nothing that needs an account', async () => {
    const leaver = await person('Mai');
    const friend = await person('Bo');
    await befriend(leaver, friend);
    await ok(as(leaver, 'GET', '/v1/accounts/me'));

    expect(await ok(as(leaver, 'POST', '/v1/accounts/sign-out'))).toEqual({ signedOut: true });

    for (const [method, path] of [
      ['GET', '/v1/accounts/me'],
      ['GET', '/v1/friends'],
      ['GET', '/v1/haunts'],
    ] as const) {
      const refused = await as(leaver, method, path);
      expect(refused.status).toBe(400);
      const body = wireErrorSchema.parse(await refused.json());
      expect(body.error.detail?.['reason']).toBe('account_required');
    }
    expect(await reasonOf(as(leaver, 'POST', '/v1/tables', { purchase: 'yearly' }))).toBe(
      'account_required',
    );
    // The account itself, and what it has, are untouched: only this device let go of it.
    expect(await count('accounts WHERE id = ?', leaver.accountId)).toBe(1);
    expect(await count('account_devices WHERE account_id = ?', leaver.accountId)).toBe(0);
    expect(await count('friendships')).toBeGreaterThanOrEqual(1);
    // Signing out again, or with no account at all, is not an error.
    expect(await ok(as(leaver, 'POST', '/v1/accounts/sign-out'))).toEqual({ signedOut: true });
    // The device is still a registered device for everything that needs no account.
    expect((await as(leaver, 'POST', '/v1/accounts/apple/nonce', {})).status).toBe(200);
    expect((await as(undefined, 'POST', '/v1/accounts/sign-out')).status).toBe(401);
  });

  it('leaves the table: the seat is freed, the socket is told and closed, and the token cannot connect again', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    hostSeat.send({ type: 'start', minutes: 10 });
    await until(() => guestSeat.state.endsAt !== null, 'the session to start');
    const endsAt = guestSeat.state.endsAt;

    await ok(as(guest, 'POST', '/v1/accounts/sign-out'));

    await until(() => guestSeat.closed !== undefined, 'the socket to close');
    expect(guestSeat.closed?.code).toBe(4403);
    expect(guestSeat.messages.at(-1)).toEqual({ type: 'error', code: 'seat_removed' });
    await until(() => hostSeat.state.seats.length === 1, 'the seat to free');
    expect(await count('table_seats WHERE account_id = ?', guest.accountId)).toBe(0);
    // The table's session goes on for whoever is still there.
    expect(hostSeat.state.endsAt).toBe(endsAt);
    expect(hostSeat.of('session_ended')).toHaveLength(0);

    const refused = await upgrade(guest, tableId);
    expect(refused.status).toBe(400);
    expect(wireErrorSchema.parse(await refused.json()).error.detail?.['reason']).toBe(
      'account_required',
    );
    // The host, who did not sign out, is unaffected.
    const again = await connect(host, tableId);
    expect(again.state.seats.map((seat) => seat.userId)).toEqual([host.accountId]);
  });
});
