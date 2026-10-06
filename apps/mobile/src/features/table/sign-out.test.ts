import { describe, expect, it } from '@jest/globals';

import type { TaskCreatePass } from '@scootch/domain';

import fixtures from '../../../../../packages/domain/src/contracts/fixtures/table-messages.json';
import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import { createTogetherRuntime } from '../../state/together-context';
import { phone } from '../session/test/phone';

import { NO_TABLE } from './table-store';
import { fakeHttp, fakeSockets } from './test/fake-table';

const pass = passFixture.response as TaskCreatePass;
const TABLE = 'abcdefghijklmnop';
const [STATE] = fixtures.server;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** A phone mid-session at a table, with the day it has made so far in its database. */
async function atATable(answers: Readonly<Record<string, unknown>> = {}) {
  const app = await phone(pass);
  await app.begin(passFixture.request.text, 10);
  const net = fakeSockets();
  const web = fakeHttp(answers);
  const together = createTogetherRuntime({
    http: web.http,
    baseUrl: 'https://api.test',
    token: () => Promise.resolve('device-token'),
    open: net.open,
    timers: app.time.timers,
    runner: app.runner,
    purchase: () => 'yearly',
    now: () => app.time.clock.now(),
  });
  together.table.sit(TABLE, null);
  await flush();
  net.last().accept();
  net.last().say(STATE);
  return { app, net, web, together };
}

describe('signing out on the phone', () => {
  it('tells the server, leaves the table, and keeps the day exactly as it was', async () => {
    const { app, net, web, together } = await atATable({
      'POST /v1/accounts/sign-out': { signedOut: true },
    });
    const day = app.store.getState();
    const stored = app.data.dump();
    const armed = app.time.armed();
    expect(together.table.getState().tableId).toBe(TABLE);

    await together.signOut();

    expect(web.sent).toEqual([{ method: 'POST', path: '/v1/accounts/sign-out', body: {} }]);
    expect(together.table.getState()).toEqual(NO_TABLE);
    expect(net.last().closed).toBe(true);
    // The one thing, its monster, the running session and its timers: none of it was the account's.
    expect(app.store.getState()).toBe(day);
    expect(app.store.getState().session?.phase).toBe('running');
    expect(app.data.dump()).toBe(stored);
    const ping = app.time.clock.now() + 20_000;
    expect(armed).toContain(ping);
    expect(app.time.armed()).toEqual(armed.filter((at) => at !== ping));
    // No message came after leaving, and nothing tries the table again.
    app.time.advanceTo(app.time.clock.now() + 60_000);
    await flush();
    expect(net.sockets).toHaveLength(1);
  });

  it('changes nothing when the server cannot be reached: still signed in, still seated', async () => {
    const { app, net, together } = await atATable({
      'POST /v1/accounts/sign-out': new Error('offline'),
    });
    const stored = app.data.dump();

    await expect(together.signOut()).rejects.toThrow();

    expect(together.table.getState().tableId).toBe(TABLE);
    expect(together.table.getState().status).toBe('online');
    expect(net.last().closed).toBe(false);
    expect(app.data.dump()).toBe(stored);
  });
});
