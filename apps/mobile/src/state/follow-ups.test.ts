import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  MINUTE_MS,
  nextScootchDayStart,
  type TaskCreateStartResponse,
} from '@scootch/domain';

import crisisFixture from '../../../../packages/voice/fixtures/task.create.crisis.en.json';
import { openRepositories } from '../data/repositories';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;
const BOUNDARY = nextScootchDayStart(MORNING, 'Europe/London');

async function finishOffline(app: Phone, text: string): Promise<void> {
  await app.say(text, 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await app.store.dispatch({ type: 'session', event: { type: 'started' } });
  await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
  await app.store.dispatch({ type: 'session_closed' });
}

describe('asking the server for what is waiting', () => {
  it("asks about today's task before the finished ones nobody has screened", async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await finishOffline(app, 'ring the bank');
    await app.say('post the letter', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    const today = app.task();

    server.online = true;
    app.time.advanceTo(MORNING + 5 * MINUTE_MS);
    await app.store.dispatch({ type: 'connection_returned' });
    // One return of the connection is enough for today's task, whatever else is waiting.
    const { tasks } = openRepositories(app.data.db);
    expect((await tasks.get(today.id))?.screen).toBe('pass');
  });
});

describe('opening the app after four with a session still inside its time', () => {
  it('finds the session running on the day it started, and turns the day once it is closed', async () => {
    const first = await stagedPhone(stagedServer());
    await first.say('ring the bank', 'typed');
    await first.store.dispatch({ type: 'one_thing_picked' });
    await first.store.dispatch({ type: 'session_set', minutes: 25 });
    first.time.jumpTo(BOUNDARY - 5 * MINUTE_MS);
    await first.store.dispatch({ type: 'session', event: { type: 'started' } });

    // The app was closed, and is opened cold at two past four.
    const app = await stagedPhone(stagedServer(), first.data, BOUNDARY + 2 * MINUTE_MS);
    expect(app.store.getState()).toMatchObject({
      localDate: '2026-10-06',
      today: { kind: 'in_session' },
      session: { phase: 'running' },
    });
    expect(app.data.count('days')).toBe(1);

    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().localDate).toBe('2026-10-07');
  });

  it('still ends a session whose time ran out before the app was opened', async () => {
    const first = await stagedPhone(stagedServer());
    await first.say('ring the bank', 'typed');
    await first.store.dispatch({ type: 'one_thing_picked' });
    await first.store.dispatch({ type: 'session_set', minutes: 10 });
    await first.store.dispatch({ type: 'session', event: { type: 'started' } });
    const app = await stagedPhone(stagedServer(), first.data, MORNING + DAY_MS);
    expect(app.store.getState()).toMatchObject({ localDate: '2026-10-07', session: null });
  });
});

describe('a rebuild that fails while screens are showing', () => {
  it('leaves the store ready, on the day it had, and says so', async () => {
    const reported: unknown[] = [];
    const app = await stagedPhone(stagedServer(), undefined, MORNING, {
      onFailure: (error) => reported.push(error),
    });
    await app.data.db.runAsync('ALTER TABLE drawer_items RENAME TO drawer_items_gone', []);
    app.time.jumpTo(BOUNDARY + 1000);
    await expect(app.store.dispatch({ type: 'day_turned' })).rejects.toBeDefined();
    expect(reported).toHaveLength(1);
    expect(app.store.getState()).toMatchObject({ ready: true, notice: 'failed' });

    // With storage back, the next thing done goes through.
    await app.data.db.runAsync('ALTER TABLE drawer_items_gone RENAME TO drawer_items', []);
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState()).toMatchObject({ ready: true, localDate: '2026-10-07' });
  });
});

describe('"Tomorrow" on a parked thought that is already in the drawer with a date', () => {
  it('keeps the date the thing really has', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    const dated = app.store.getState().drawer.items.find((item) => item.dueDate !== null);
    if (!dated) throw new Error('the recorded call hears a date');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({
      type: 'session',
      event: { type: 'thought_parked', text: dated.text },
    });
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    const [thought] = app.store.getState().parkedThoughts;
    if (!thought) throw new Error('the thought is handed over');
    await app.store.dispatch({ type: 'thought_resolved', thought, resolution: 'keep' });
    const after = app.store.getState().drawer.items.find((item) => item.id === dated.id);
    expect(after).toMatchObject({ dueDate: dated.dueDate, returnOn: dated.returnOn });
  });
});

describe('a crisis verdict that arrives for a task finished today', () => {
  it('keeps the finished task and what it earned; the day goes quiet', async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await finishOffline(app, 'ring the bank');
    const before = { tasks: app.data.count('tasks'), pieces: app.data.count('world_pieces') };

    server.online = true;
    server.start = crisisFixture.response as TaskCreateStartResponse;
    await app.store.dispatch({ type: 'connection_returned' });
    expect(app.store.getState().today).toEqual({ kind: 'crisis' });
    expect(app.data.count('tasks')).toBe(before.tasks);
    expect(app.data.count('world_pieces')).toBe(before.pieces);
    expect(app.data.count('sessions')).toBe(1);
  });
});
