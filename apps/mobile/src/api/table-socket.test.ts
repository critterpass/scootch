import { describe, expect, it } from '@jest/globals';

import { TABLE_CLOSE_CODES, tableClientMessageSchema } from '@scootch/domain';

import fixtures from '../../../../packages/domain/src/contracts/fixtures/table-messages.json';
import { fakeTime } from '../effects/test/fake-adapters';
import { fakeSockets } from '../features/table/test/fake-table';

import {
  createTableConnection,
  tableSocketUrl,
  type ConnectionStatus,
  type SeatMode,
  type TableSend,
} from './table-socket';

const TABLE = 'abcdefghijklmnop';

async function connected(seat: SeatMode = { workMode: 'paperwork', hidden: false }) {
  const time = fakeTime(1_000_000);
  const net = fakeSockets();
  const statuses: ConnectionStatus[] = [];
  const messages: unknown[] = [];
  const connection = createTableConnection({
    baseUrl: 'https://api.test',
    tableId: TABLE,
    token: () => Promise.resolve('device-token'),
    open: net.open,
    timers: time.timers,
    seat: () => seat,
    onMessage: (message) => void messages.push(message),
    onStatus: (status) => void statuses.push(status),
  });
  connection.start();
  await flush();
  net.last().accept();
  return { time, net, statuses, messages, connection };
}

/** Lets the token promise and what follows it run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('the table connection', () => {
  it('connects as the device, with a work mode id and nothing else in the address', async () => {
    const { net } = await connected();
    expect(net.last().url).toBe(`wss://api.test/v1/tables/${TABLE}/ws?mode=paperwork`);
    expect(net.last().headers).toEqual({ Authorization: 'Bearer device-token' });
    expect(tableSocketUrl('https://api.test', TABLE, { workMode: null, hidden: true })).toBe(
      `wss://api.test/v1/tables/${TABLE}/ws?hidden=1`,
    );
    expect(tableSocketUrl('https://api.test', TABLE, { workMode: null, hidden: false })).toBe(
      `wss://api.test/v1/tables/${TABLE}/ws`,
    );
  });

  it('sends exactly the contract’s messages, none of which can hold words', async () => {
    const { net, connection } = await connected();
    const sends = fixtures.client as TableSend[];
    for (const message of sends) connection.send(message);
    expect(net.frames().map((frame) => JSON.parse(frame) as unknown)).toEqual(fixtures.client);
    for (const frame of net.frames()) {
      const parsed = tableClientMessageSchema.parse(JSON.parse(frame));
      expect(parsed.type).not.toBe('label');
    }
  });

  it('comes back to the same seat after the line drops, waiting longer each time', async () => {
    const { net, time, statuses } = await connected();
    net.last().cut();
    expect(statuses.at(-1)).toBe('reconnecting');
    time.advanceTo(1_000_000 + 999);
    expect(net.sockets).toHaveLength(1);
    time.advanceTo(1_000_000 + 1_000);
    await flush();
    expect(net.sockets).toHaveLength(2);
    // The same table and the same seat announcement: the server gives the person their seat back.
    expect(net.last().url).toBe(net.sockets[0]?.url);

    net.last().cut();
    time.advanceTo(1_000_000 + 2_999);
    await flush();
    expect(net.sockets).toHaveLength(2);
    time.advanceTo(1_000_000 + 3_000);
    await flush();
    expect(net.sockets).toHaveLength(3);
    net.last().accept();
    expect(statuses.at(-1)).toBe('online');
  });

  it('stops for good when the same person sits down on another device', async () => {
    const { net, time, statuses, messages } = await connected();
    net.last().say({ type: 'replaced' });
    expect(statuses.at(-1)).toBe('replaced');
    expect(messages).toEqual([{ type: 'replaced' }]);
    expect(net.last().closed).toBe(true);
    time.advanceTo(1_000_000 + 10 * 60_000);
    await flush();
    expect(net.sockets).toHaveLength(1);
  });

  it('treats the replaced close code as final even when the message never arrived', async () => {
    const { net, time, statuses } = await connected();
    net.last().cut(TABLE_CLOSE_CODES.replaced);
    time.advanceTo(1_000_000 + 10 * 60_000);
    await flush();
    expect(statuses.at(-1)).toBe('replaced');
    expect(net.sockets).toHaveLength(1);
  });

  it('does not come back to a seat that was taken away', async () => {
    const { net, time, statuses } = await connected();
    net.last().say({ type: 'error', code: 'seat_removed' });
    net.last().cut(TABLE_CLOSE_CODES.notSeated);
    time.advanceTo(1_000_000 + 10 * 60_000);
    await flush();
    expect(statuses.at(-1)).toBe('removed');
    expect(net.sockets).toHaveLength(1);
  });

  it('treats a line that has gone quiet as dropped', async () => {
    const { net, time, statuses } = await connected();
    time.advanceTo(1_000_000 + 20_000);
    expect(net.last().sent).toContain('ping');
    time.advanceTo(1_000_000 + 30_000);
    expect(statuses.at(-1)).toBe('reconnecting');
  });

  it('stays online while the server answers its pings', async () => {
    const { net, time, statuses } = await connected();
    time.advanceTo(1_000_000 + 20_000);
    net.last().say('pong');
    time.advanceTo(1_000_000 + 35_000);
    expect(statuses.at(-1)).toBe('online');
  });

  it('tries at once when the app comes back to the front', async () => {
    const { net, connection } = await connected();
    net.last().cut();
    connection.wake();
    await flush();
    expect(net.sockets).toHaveLength(2);
  });

  it('gives the seat up when leaving, and never reconnects', async () => {
    const { net, time, statuses, connection } = await connected();
    connection.leave();
    expect(net.frames()).toEqual(['{"type":"leave"}']);
    time.advanceTo(1_000_000 + 10 * 60_000);
    await flush();
    expect(statuses.at(-1)).toBe('left');
    expect(net.sockets).toHaveLength(1);
  });
});
