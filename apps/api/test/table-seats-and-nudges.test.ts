import { evictDurableObject, runDurableObjectAlarm } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { tableStub } from '../src/tables/tables';

import {
  as,
  connect,
  inviteCode,
  ok,
  openTable,
  person,
  settle,
  sitDown,
  until,
} from './table-support';

const minute = 60_000;

afterEach(() => {
  vi.useRealTimers();
});

/** Moves the clock the table reads to `at`, then fires its alarm as the runtime would. */
async function alarmAt(tableId: string, at: number): Promise<void> {
  vi.useFakeTimers({ toFake: ['Date'], now: at });
  await runDurableObjectAlarm(tableStub(env, tableId));
}

type Mine = { table: { tableId: string; endsAt: number | null; minutes: number | null } | null };
const mine = (who: Parameters<typeof as>[0]) => ok<Mine>(as(who, 'GET', '/v1/tables/mine'));

describe('a seat through a session', () => {
  it('is kept with no connection until ten minutes after the session ends, shown as working, and can be found again after a relaunch', async () => {
    const [host, guest] = [await person('Mai'), await person('Bo')];
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    const started = Date.now();
    hostSeat.send({ type: 'start', minutes: 25 });
    await until(() => guestSeat.state.endsAt !== null, 'the session to start');
    const endsAt = guestSeat.state.endsAt ?? 0;

    // The guest's phone locks: the socket drops, and the table sleeps.
    guestSeat.ws.close(1001, 'locked');
    await until(() => hostSeat.seatOf(guest)?.online === false, 'the drop to show');
    expect(hostSeat.seatOf(guest)?.status).toBe('working');
    await evictDurableObject(tableStub(env, tableId));

    // Twenty minutes in, twice the old limit, the seat is still theirs.
    await alarmAt(tableId, started + 20 * minute);
    await settle();
    expect(hostSeat.seatOf(guest)?.status).toBe('working');
    expect(await mine(guest)).toMatchObject({ table: { tableId, endsAt, minutes: 25 } });

    // The app comes back, asks where it sits, and reconnects to the same clock.
    const back = await connect(guest, tableId);
    expect(back.state.tableId).toBe(tableId);
    expect(back.state.endsAt).toBe(endsAt);
    await until(() => hostSeat.seatOf(guest)?.status === 'here', 'the return to show');
    back.ws.close(1001, 'locked again');
    await until(() => hostSeat.seatOf(guest)?.status === 'working', 'the second drop');

    // The session ends: nobody is working any more, and the seat has ten minutes of grace.
    await alarmAt(tableId, endsAt + 1000);
    await until(() => hostSeat.of('session_ended').length === 1, 'the session to end');
    await until(() => hostSeat.seatOf(guest)?.status === 'away', 'the seat to read away');
    await alarmAt(tableId, endsAt + 9 * minute);
    await settle();
    expect(hostSeat.state.seats).toHaveLength(2);

    await alarmAt(tableId, endsAt + 10 * minute + 1000);
    await until(() => hostSeat.state.seats.length === 1, 'the seat to free');
    expect(hostSeat.state.left).toMatchObject([
      { userId: guest.accountId, name: 'Bo', done: false },
    ]);
    expect(await mine(guest)).toEqual({ table: null });
  });

  it('is not kept for someone who never connected, or who left the table before the session began', async () => {
    const [host, absent] = [await person('Mai'), await person('Bo')];
    const { tableId, seat: hostSeat } = await openTable(host);
    await ok(
      as(absent, 'POST', '/v1/tables/join', {
        code: await inviteCode(host, tableId),
        purchase: 'free',
      }),
    );
    await until(() => hostSeat.state.seats.length === 2, 'the seat to be taken');
    const started = Date.now();
    hostSeat.send({ type: 'start', minutes: 50 });
    await until(() => hostSeat.state.endsAt !== null, 'the session to start');
    expect(hostSeat.seatOf(absent)?.status).toBe('away');

    await alarmAt(tableId, started + 10 * minute + 1000);
    await until(() => hostSeat.state.seats.length === 1, 'the empty seat to free');
    expect(hostSeat.state.endsAt).not.toBeNull();
  });
});

describe('nudges', () => {
  it('are three to each person, shown per seat to the one who sends them', async () => {
    const [host, a, b] = [await person('Mai'), await person('Bo'), await person('Cy')];
    const { tableId, seat: hostSeat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    const aSeat = await sitDown(a, code, tableId);
    const bSeat = await sitDown(b, code, tableId);

    for (let sent = 1; sent <= 3; sent += 1) {
      hostSeat.send({ type: 'nudge', to: a.accountId });
      await until(() => hostSeat.of('nudge_sent').length === sent, `nudge ${sent}`);
    }
    hostSeat.send({ type: 'nudge', to: a.accountId });
    await until(() => hostSeat.of('error').length === 1, 'the fourth to be refused');
    expect(hostSeat.of('error')[0]?.code).toBe('nudge_limit');

    // The limit is per person: the other seat can still be nudged, three times.
    hostSeat.send({ type: 'nudge', to: b.accountId });
    await until(() => bSeat.of('nudged').length === 1, 'a nudge to the other seat');
    await until(() => hostSeat.seatOf(b)?.nudgesLeft === 2, 'the count to show');
    expect(hostSeat.seatOf(a)?.nudgesLeft).toBe(0);
    expect(hostSeat.seatOf(host)?.nudgesLeft).toBe(2);
    // Someone else's counts are their own.
    expect(aSeat.seatOf(host)?.nudgesLeft).toBe(3);
    expect(aSeat.of('nudged')).toHaveLength(3);
  });

  it('are not counted when they can reach nobody: the person is offline and no push is sent', async () => {
    const [host, guest] = [await person('Mai'), await person('Bo')];
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    guestSeat.ws.close(1001, 'locked');
    await until(() => hostSeat.seatOf(guest)?.online === false, 'the drop to show');

    hostSeat.send({ type: 'nudge', to: guest.accountId });
    await until(() => hostSeat.of('nudge_sent').length === 1, 'the answer');
    expect(hostSeat.of('nudge_sent')[0]).toEqual({
      type: 'nudge_sent',
      to: guest.accountId,
      nudgesLeft: 3,
      delivered: false,
    });
    const stored = await tableStub(env, tableId).stored();
    expect(stored?.seats[0]).toMatchObject({ nudgesSent: 0, nudges: {} });

    // Back at the table, all three are still theirs to receive.
    const back = await connect(guest, tableId);
    for (let sent = 1; sent <= 3; sent += 1) hostSeat.send({ type: 'nudge', to: guest.accountId });
    await until(() => back.of('nudged').length === 3, 'three nudges');
  });
});

describe('finishing and leaving', () => {
  it('shows a seat as done, says who finished and left, and how long a seat has been taken', async () => {
    const [host, guest] = [await person('Mai'), await person('Bo')];
    const before = Date.now();
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    const seatedAt = hostSeat.seatOf(guest)?.seatedAt ?? 0;
    expect(seatedAt).toBeGreaterThanOrEqual(before);
    expect(seatedAt).toBeLessThanOrEqual(Date.now());
    expect(hostSeat.seatOf(guest)?.done).toBe(false);

    guestSeat.send({ type: 'done' });
    await until(() => hostSeat.seatOf(guest)?.done === true, 'done to show');
    guestSeat.send({ type: 'leave' });
    await until(() => hostSeat.state.seats.length === 1, 'the seat to free');
    expect(hostSeat.state.left).toMatchObject([
      { userId: guest.accountId, name: 'Bo', done: true },
    ]);

    // A new session clears "done" for whoever is still here.
    hostSeat.send({ type: 'done' });
    await until(() => hostSeat.seatOf(host)?.done === true, 'the host to be done');
    hostSeat.send({ type: 'start', minutes: 10 });
    await until(() => hostSeat.state.endsAt !== null, 'a new session');
    expect(hostSeat.seatOf(host)?.done).toBe(false);
  });

  it('never lists someone whose seat was taken away', async () => {
    const [host, guest] = [await person('Mai'), await person('Bo')];
    const { tableId, seat: hostSeat } = await openTable(host);
    await sitDown(guest, await inviteCode(host, tableId), tableId);
    await until(() => hostSeat.state.seats.length === 2, 'two seats');

    await tableStub(env, tableId).remove(guest.accountId);
    await until(() => hostSeat.state.seats.length === 1, 'the seat to go');
    expect(hostSeat.state.left).toEqual([]);
  });
});
