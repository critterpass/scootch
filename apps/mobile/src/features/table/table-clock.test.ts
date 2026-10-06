import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, type LiveSession, type TaskCreatePass } from '@scootch/domain';

import fixtures from '../../../../../packages/domain/src/contracts/fixtures/table-messages.json';
import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import { createTogetherRuntime } from '../../state/together-context';
import { minutesLeft } from '../session/session-view';
import { phone } from '../session/test/phone';

import { sharedEnd, tableEndsAt } from './table-clock';
import { tableTimer } from './table-rules';
import { fakeHttp, fakeSockets } from './test/fake-table';

const pass = passFixture.response as TaskCreatePass;
const TABLE = 'abcdefghijklmnop';
const [STATE] = fixtures.server;
/** The server's clock runs this far ahead of the phone's. */
const AHEAD = 3_000;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** A phone with its one thing set, seated at a table over a fake socket. */
async function seated() {
  const app = await phone(pass);
  await app.store.dispatch({
    type: 'text_submitted',
    text: passFixture.request.text,
    source: 'typed',
    energy: 'medium',
  });
  const net = fakeSockets();
  const { table } = createTogetherRuntime({
    http: fakeHttp().http,
    baseUrl: 'https://api.test',
    token: () => Promise.resolve('device-token'),
    open: net.open,
    timers: app.time.timers,
    runner: app.runner,
    purchase: () => 'yearly',
    now: () => app.time.clock.now(),
  });
  table.sit(TABLE, null);
  await flush();
  net.last().accept();
  const now = () => app.time.clock.now();
  /** The table says its session has this long left, stamped with its own clock. */
  const says = (left: number | null, minutes: 10 | 25 | null = 10) =>
    net.last().say({
      ...STATE,
      endsAt: left === null ? null : now() + AHEAD + left,
      minutes: left === null ? null : minutes,
      serverNow: now() + AHEAD,
    });
  const live = () => app.store.getState().session as LiveSession;
  /** What the strip above the session does whenever the table or the session changes. */
  const follow = async () => {
    const end = sharedEnd(table.getState(), live(), now());
    if (end !== null) await app.store.dispatch({ type: 'table_clock', endsAt: end });
    return end;
  };
  /** "Join in", as the table screen does it. */
  const joinIn = async () => {
    const timer = tableTimer(table.getState(), { taskSet: true, inSession: false }, now());
    if (timer.kind !== 'join_in') throw new Error(`no session to join: ${timer.kind}`);
    const end = tableEndsAt(table.getState(), now());
    await app.store.dispatch({ type: 'session_set', minutes: timer.minutes, treat: null });
    await app.session({ type: 'started' });
    if (end !== null) await app.store.dispatch({ type: 'table_clock', endsAt: end });
    return timer;
  };
  return { app, net, table, now, says, live, follow, joinIn };
}

describe('the table’s clock on the phone', () => {
  it('gives a late seat the time the table has left, whatever the two clocks say', async () => {
    const { app, now, says, live, joinIn } = await seated();
    says(6 * MINUTE_MS);

    const timer = await joinIn();

    expect(timer).toEqual({ kind: 'join_in', minutes: 10, left: 6 });
    expect(live().endsAt).toBe(now() + 6 * MINUTE_MS);
    expect(minutesLeft(live(), now())).toBe(6);
    // The timer, the stored row and the Live Activity all hold the table's end, not ten minutes.
    expect(app.time.armed()).toContain(now() + 6 * MINUTE_MS);
    expect(app.time.armed()).not.toContain(now() + 10 * MINUTE_MS);
    const [row] = await app.repositories.sessions.all();
    expect(Date.parse(row?.endsAt ?? '')).toBe(now() + 6 * MINUTE_MS);
    expect(app.device.calls.live.at(-1)).toContain(`until ${now() + 6 * MINUTE_MS}`);
  });

  it('moves the starter’s session onto the table’s end, a moment after their own', async () => {
    const { app, now, says, live, follow } = await seated();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: null });
    await app.session({ type: 'started' });
    const own = live().endsAt ?? 0;

    // The start took 1.4 seconds to reach the table, so its ten minutes end that much later.
    app.time.jumpTo(now() + 1_400);
    says(10 * MINUTE_MS);

    expect(await follow()).toBe(own + 1_400);
    expect(live().endsAt).toBe(own + 1_400);
    expect(await follow()).toBeNull();
  });

  it('runs on its own timer with the line down, and takes the table’s clock back without gaining time', async () => {
    const { app, net, table, now, says, live, follow, joinIn } = await seated();
    says(6 * MINUTE_MS);
    await joinIn();
    const end = live().endsAt ?? 0;

    net.last().cut();
    expect(table.getState().status).toBe('reconnecting');
    app.time.jumpTo(now() + 2 * MINUTE_MS);
    // Down: nothing is taken from the table, and the session counts down by itself.
    expect(await follow()).toBeNull();
    expect(live().endsAt).toBe(end);
    expect(minutesLeft(live(), now())).toBe(4);

    table.wake();
    await flush();
    net.last().accept();
    // Back, with a clock that would hand a minute back: the countdown does not go up.
    says(5 * MINUTE_MS);
    expect(await follow()).toBeNull();
    expect(live().endsAt).toBe(end);
    // Back, with the table a little ahead of the phone's own count: the table's end is taken.
    says(4 * MINUTE_MS - 20_000);
    expect(await follow()).toBe(end - 20_000);
    expect(live().endsAt).toBe(end - 20_000);
    expect(minutesLeft(live(), now())).toBe(4);

    // Time is up when the table's clock says so, once.
    app.time.advanceTo(end - 20_000);
    await flush();
    expect(app.store.getState().session?.phase).toBe('time_up');
  });

  it('leaves a session alone when the table has none, has ended, or starts one of its own later', async () => {
    const { app, net, now, says, live, follow } = await seated();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: null });
    await app.session({ type: 'started' });
    const end = live().endsAt ?? 0;

    says(null);
    expect(await follow()).toBeNull();
    net.last().say({ type: 'session_ended' });
    expect(await follow()).toBeNull();
    // Five minutes into working alone, the others start twenty-five minutes of their own.
    app.time.jumpTo(now() + 5 * MINUTE_MS);
    says(25 * MINUTE_MS, 25);
    expect(await follow()).toBeNull();
    expect(live().endsAt).toBe(end);
  });
});
