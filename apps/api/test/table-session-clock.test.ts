import { evictDurableObject, runDurableObjectAlarm } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WORK_MODE_IDS } from '../src/tables/table-contract';
import { tableStub } from '../src/tables/tables';

import { connect, inviteCode, openTable, person, settle, sitDown, until } from './table-support';

const minute = 60_000;

afterEach(() => {
  vi.useRealTimers();
});

/** Moves the clock the table reads, then fires its alarm as the runtime would. */
async function alarmAfter(tableId: string, ms: number): Promise<void> {
  vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + ms });
  await runDurableObjectAlarm(tableStub(env, tableId));
}

describe('the table’s session clock', () => {
  it('is one clock: every seat is sent the same end, a late seat the time that is left, through a sleep, a leaving and a reconnection', async () => {
    const [host, guest, late] = await Promise.all(['Mai', 'Bo', 'Cy'].map((name) => person(name)));
    if (!host || !guest || !late) throw new Error('no people');
    const { tableId, seat: hostSeat } = await openTable(host);
    const code = await inviteCode(host, tableId);
    const guestSeat = await sitDown(guest, code, tableId);
    expect(hostSeat.state.endsAt).toBeNull();

    const before = Date.now();
    hostSeat.send({ type: 'start', minutes: 10 });
    await until(() => guestSeat.state.endsAt !== null, 'the session to start');
    await until(() => hostSeat.state.endsAt !== null, 'the starter to hear of it');
    const endsAt = guestSeat.state.endsAt ?? 0;
    expect(hostSeat.state.endsAt).toBe(endsAt);
    expect(endsAt).toBeGreaterThanOrEqual(before + 10 * minute);
    expect(endsAt).toBeLessThanOrEqual(Date.now() + 10 * minute);
    expect(guestSeat.state.minutes).toBe(10);

    // Four minutes in, asleep with its sockets open, the table still holds the same end.
    vi.useFakeTimers({ toFake: ['Date'], now: before + 4 * minute });
    await evictDurableObject(tableStub(env, tableId));
    const lateSeat = await sitDown(late, code, tableId);
    expect(lateSeat.state.endsAt).toBe(endsAt);
    const left = endsAt - lateSeat.state.serverNow;
    expect(left).toBeGreaterThanOrEqual(6 * minute);
    expect(left).toBeLessThan(6 * minute + 5000);

    // A seat that leaves ends nothing, and one that drops and returns is given the same clock.
    hostSeat.send({ type: 'leave' });
    await until(() => guestSeat.state.seats.length === 2, 'the seat to free');
    expect(guestSeat.state.endsAt).toBe(endsAt);
    guestSeat.ws.close(1001, 'dropped');
    await until(() => lateSeat.seatOf(guest)?.online === false, 'the drop to show');
    const back = await connect(guest, tableId);
    expect(back.state.endsAt).toBe(endsAt);
    expect(back.state.minutes).toBe(10);
    expect(lateSeat.of('session_ended')).toHaveLength(0);
  });

  it('ends once, for everyone at the table, and can then be started again', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    hostSeat.send({ type: 'start', minutes: 10 });
    await until(() => guestSeat.state.endsAt !== null, 'the session to start');

    // An alarm that fires early (a seat to free, a retry) ends nothing.
    await alarmAfter(tableId, 9 * minute);
    await settle();
    expect(guestSeat.of('session_ended')).toHaveLength(0);
    expect(guestSeat.state.endsAt).not.toBeNull();

    await alarmAfter(tableId, 2 * minute);
    await until(() => guestSeat.of('session_ended').length === 1, 'the end to reach the guest');
    await until(() => hostSeat.of('session_ended').length === 1, 'the end to reach the host');
    await until(() => hostSeat.state.endsAt === null, 'the clock to clear');
    // The alarm running again, as the runtime may, says it only the once.
    await runDurableObjectAlarm(tableStub(env, tableId));
    await settle();
    expect(guestSeat.of('session_ended')).toHaveLength(1);
    expect(hostSeat.of('session_ended')).toHaveLength(1);
    expect(guestSeat.state.endsAt).toBeNull();
    expect(guestSeat.state.minutes).toBeNull();

    guestSeat.send({ type: 'start', minutes: 25 });
    await until(() => hostSeat.state.endsAt !== null, 'a second session');
    expect(hostSeat.state.minutes).toBe(25);
  });
});

describe('a seat’s work mode', () => {
  it('reaches the other seats as an id from the list, follows a change, and is hidden with the label', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host, '?mode=dishes');
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);

    expect(guestSeat.seatOf(host)?.workMode).toBe('dishes');
    // No work mode (a serious or unscreened task): the seat is drawn at plain work.
    expect(hostSeat.seatOf(guest)?.workMode).toBeNull();

    guestSeat.send({ type: 'mode', workMode: 'coding', hidden: false });
    await until(() => hostSeat.seatOf(guest)?.workMode === 'coding', 'the mode to arrive');
    guestSeat.send({ type: 'mode', workMode: 'coding', hidden: true });
    await until(() => hostSeat.seatOf(guest)?.label === 'busy', 'the label to hide');
    expect(hostSeat.seatOf(guest)?.workMode).toBeNull();
    expect(guestSeat.seatOf(guest)?.workMode).toBeNull();
  });

  it('is refused when it is not on the list, and no message holds anything but ids, names and fixed words', async () => {
    const task = 'renew the passport before friday';
    const host = await person('Mai');
    const guest = await person('Bo');
    const { tableId, seat: hostSeat } = await openTable(host, '?mode=paperwork');
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);

    for (const workMode of ['passport', task, 'Paperwork', '']) {
      guestSeat.send({ type: 'mode', workMode, hidden: false });
    }
    await until(() => guestSeat.of('error').length === 4, 'four refusals');
    expect(guestSeat.of('error').map((error) => error.code)).toEqual(Array(4).fill('bad_message'));
    hostSeat.send({ type: 'start', minutes: 10 });
    hostSeat.send({ type: 'nudge', to: guest.accountId });
    await until(() => guestSeat.of('nudged').length === 1, 'the nudge');
    await until(() => guestSeat.state.endsAt !== null, 'the session');
    expect(hostSeat.seatOf(guest)?.workMode).toBeNull();

    const sent = [...hostSeat.messages, ...guestSeat.messages];
    const serialised = JSON.stringify(sent);
    for (const word of task.split(' ')) expect(serialised).not.toContain(word);
    // Every string in every message is an account id, a seat name, a fixed word or a work mode.
    const allowed = new Set<string>([
      ...[host, guest].flatMap((each) => [each.accountId, each.name]),
      ...['state', 'error', 'bad_message', 'nudged', 'nudge_sent', 'admin', ''],
      ...WORK_MODE_IDS,
    ]);
    const strings: string[] = [];
    JSON.stringify(sent, (_key, value: unknown) => {
      if (typeof value === 'string') strings.push(value);
      return value;
    });
    expect(strings.filter((value) => !allowed.has(value))).toEqual([]);
  });
});
