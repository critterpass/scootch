import { evictDurableObject, runDurableObjectAlarm } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { tableStub } from '../src/tables/tables';

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
  settle,
  sitDown,
  until,
  type Person,
  type Seat,
} from './table-support';

const minute = 60_000;

afterEach(() => {
  vi.useRealTimers();
});

/** Moves the clock the table reads, then fires its alarm as the runtime would. */
async function alarmAfter(tableId: string, ms: number): Promise<void> {
  vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + ms });
  await runDurableObjectAlarm(tableStub(env, tableId));
}

/** A host and three guests, all connected. */
async function fullTable(): Promise<{
  tableId: string;
  code: string;
  people: Person[];
  seats: Seat[];
}> {
  const people = await Promise.all(['Mai', 'Bo', 'Cy', 'Di'].map((name) => person(name)));
  const [host, ...guests] = people as [Person, ...Person[]];
  const { tableId, seat } = await openTable(host);
  const code = await inviteCode(host, tableId);
  const seats = [seat];
  for (const guest of guests) seats.push(await sitDown(guest, code, tableId));
  await until(() => seats.every((each) => each.state.seats.length === 4), 'four seats');
  return { tableId, code, people, seats };
}

describe('a table', () => {
  it('seats four, each seeing four online seats with names, and refuses a fifth', async () => {
    const { tableId, code, people, seats } = await fullTable();

    for (const [index, seat] of seats.entries()) {
      expect(seat.state.you).toBe(people[index]?.accountId);
      expect(seat.state.hostId).toBe(people[0]?.accountId);
      expect(seat.state.seats.map((each) => each.online)).toEqual([true, true, true, true]);
      expect(seat.state.seats.map((each) => each.name)).toEqual(['Mai', 'Bo', 'Cy', 'Di']);
    }

    const fifth = await person('Eve');
    await befriend(people[0] as Person, fifth);
    expect(await reasonOf(as(fifth, 'POST', '/v1/tables/join', { code, purchase: 'yearly' }))).toBe(
      'table_full',
    );
    // Without a seat the socket is told why and closed; the table is unchanged.
    const refused = await connect(fifth, tableId);
    expect(refused.messages).toEqual([{ type: 'error', code: 'not_seated' }]);
    await until(() => refused.closed !== undefined, 'the refusal to close');
    expect(refused.closed?.code).toBe(4403);
    expect(seats[0]?.state.seats).toHaveLength(4);
  });

  it('sends `replaced` to the old socket when the same person connects again, with no offline flicker', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const first = await sitDown(guest, await inviteCode(host, tableId), tableId);

    const second = await connect(guest, tableId);

    await until(() => first.of('replaced').length === 1, 'replaced');
    expect(first.messages.at(-1)).toEqual({ type: 'replaced' });
    await settle();
    expect(second.state.seats).toHaveLength(2);
    // From the moment the guest first showed online, the host never saw them offline.
    const seen = hostSeat
      .of('state')
      .map((state) => state.seats.find((each) => each.userId === guest.accountId)?.online);
    expect(seen.slice(seen.indexOf(true))).not.toContain(false);
    expect(seen.at(-1)).toBe(true);
  });

  it('leaves a closing socket out of presence, and keeps the seat', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);

    guestSeat.ws.close(1001, 'gone');

    await until(() => hostSeat.seatOf(guest)?.online === false, 'the guest to show offline');
    expect(hostSeat.state.seats).toHaveLength(2);
  });

  it('keeps the timer when the host leaves and when the table hibernates', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const late = await person('Cy');
    const { tableId, seat: hostSeat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    const guestSeat = await sitDown(guest, code, tableId);

    // Anyone seated may start.
    guestSeat.send({ type: 'start', minutes: 25 });
    await until(() => hostSeat.state.endsAt !== null, 'the session to start');
    const endsAt = hostSeat.state.endsAt;
    expect(endsAt).toBeGreaterThan(Date.now() + 24 * minute);
    guestSeat.send({ type: 'start', minutes: 10 });
    await until(() => guestSeat.of('error').length === 1, 'the second start to be refused');
    expect(guestSeat.of('error')[0]?.code).toBe('session_running');

    hostSeat.send({ type: 'leave' });
    await until(() => hostSeat.closed !== undefined, 'the host to leave');
    expect(hostSeat.closed?.code).toBe(1000);
    await until(() => guestSeat.state.seats.length === 1, 'the seat to free');
    expect(guestSeat.state.hostId).toBe(guest.accountId);
    expect(guestSeat.state.endsAt).toBe(endsAt);

    // The object is thrown out of memory with its sockets open: everything must come back
    // from storage and the socket attachments.
    await evictDurableObject(tableStub(env, tableId));
    const lateSeat = await sitDown(late, code, tableId);
    expect(lateSeat.state.endsAt).toBe(endsAt);
    expect(lateSeat.state.minutes).toBe(25);
    await until(
      () => guestSeat.state.seats.length === 2,
      'the sleeping socket to hear of the newcomer',
    );

    await alarmAfter(tableId, 26 * minute);
    await until(() => guestSeat.of('session_ended').length === 1, 'the session to end');
    await until(() => guestSeat.state.endsAt === null, 'the timer to clear');
    expect(lateSeat.of('session_ended')).toHaveLength(1);
  });

  it('refuses the fourth nudge, with or without a session, and counts afresh at a start', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);

    for (let sent = 1; sent <= 3; sent += 1) {
      hostSeat.send({ type: 'nudge', to: guest.accountId });
      await until(() => hostSeat.of('nudge_sent').length === sent, `nudge ${sent}`);
    }
    expect(hostSeat.of('nudge_sent').at(-1)).toEqual({
      type: 'nudge_sent',
      to: guest.accountId,
      nudgesLeft: 0,
      delivered: true,
    });
    hostSeat.send({ type: 'nudge', to: guest.accountId });
    await until(() => hostSeat.of('error').length === 1, 'the fourth to be refused');
    expect(hostSeat.of('error')[0]?.code).toBe('nudge_limit');
    expect(guestSeat.of('nudged')).toHaveLength(3);
    expect(guestSeat.of('nudged')[0]).toEqual({ type: 'nudged', from: host.accountId });

    hostSeat.send({ type: 'start', minutes: 10 });
    await until(() => hostSeat.seatOf(host)?.nudgesLeft === 3, 'the count to reset');
  });

  it('drops a muted person’s nudge without telling them', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    await ok(as(host, 'POST', '/v1/seats/mute', { accountId: guest.accountId, muted: true }));

    guestSeat.send({ type: 'nudge', to: host.accountId });

    await until(() => guestSeat.of('nudge_sent').length === 1, 'the sender’s receipt');
    expect(guestSeat.of('nudge_sent')[0]?.nudgesLeft).toBe(2);
    expect(guestSeat.of('error')).toHaveLength(0);
    await settle();
    expect(hostSeat.of('nudged')).toHaveLength(0);
    // Nothing the muted person can ask for says so either.
    const mine = JSON.stringify(await ok(as(guest, 'GET', '/v1/accounts/me')));
    expect(mine).not.toContain('mute');
  });

  it('frees an offline seat after ten minutes, by the alarm, and not before', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    guestSeat.ws.close(1001, 'gone');
    await until(() => hostSeat.seatOf(guest)?.online === false, 'offline');

    await alarmAfter(tableId, 9 * minute);
    await settle();
    expect(hostSeat.state.seats).toHaveLength(2);

    await alarmAfter(tableId, 11 * minute);
    await until(() => hostSeat.state.seats.length === 1, 'the seat to be freed');
    expect(await count('table_seats WHERE table_id = ?', tableId)).toBe(1);
  });

  it('closes when it has been empty for ten minutes, and its invite dies with it', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    seat.send({ type: 'leave' });
    await until(() => seat.closed !== undefined, 'the host to leave');

    await alarmAfter(tableId, 11 * minute);

    expect(await count('tables WHERE id = ? AND closed_at IS NOT NULL', tableId)).toBe(1);
    expect(await reasonOf(as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toBe(
      'invite_not_valid',
    );
  });

  it('does not seat a banned account, or one blocked by someone at the table', async () => {
    const host = await person('Mai');
    const banned = await person('Bo');
    const blocked = await person('Cy');
    const { tableId } = await openTable(host);
    const code = await inviteCode(host, tableId);
    await env.DB.prepare('UPDATE accounts SET banned_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), banned.accountId)
      .run();
    await ok(as(host, 'POST', '/v1/seats/block', { accountId: blocked.accountId, blocked: true }));

    expect(await reasonOf(as(banned, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toBe(
      'not_allowed',
    );
    expect(await reasonOf(as(banned, 'POST', '/v1/tables', { purchase: 'yearly' }))).toBe(
      'not_allowed',
    );
    // A block answers like a dead link, so it gives nothing away.
    expect(await reasonOf(as(blocked, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toBe(
      'invite_not_valid',
    );
    expect(await count('table_seats WHERE table_id = ?', tableId)).toBe(1);
  });
});
