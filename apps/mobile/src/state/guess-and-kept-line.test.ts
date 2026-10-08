import { describe, expect, it } from '@jest/globals';

import { DAY_MS, MINUTE_MS, sessionOpening, type TaskRow } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

const LINE = 'reading his last email. Just reading';

/** A thing said and set, with what the set task's own controls would have stored on it. */
async function taskSet(app: Phone, stored: Partial<TaskRow> = {}): Promise<void> {
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  const { tasks } = openRepositories(app.data.db);
  await tasks.put({ ...app.task(), ...stored });
  // The store reads the day again, as it does after any of its own writes.
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await app.store.dispatch({ type: 'app_foregrounded' });
}

async function start(app: Phone): Promise<void> {
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await app.store.dispatch({ type: 'session', event: { type: 'started' } });
}

async function stopNotFinished(app: Phone, at: number): Promise<void> {
  app.time.advanceTo(at);
  await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
}

async function stored(app: Phone) {
  const { tasks, monsters } = openRepositories(app.data.db);
  return { tasks: await tasks.all(), monsters: await monsters.all() };
}

describe('the guess at the catch', () => {
  it('is frozen onto the monster beside the real minutes', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app, { guessMinutes: 120 });
    await start(app);
    app.time.advanceTo(MORNING + 7 * MINUTE_MS);
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });

    expect((await stored(app)).monsters).toMatchObject([
      { number: 1, catchMinutes: 7, guessMinutes: 120 },
    ]);
  });

  it('leaves a card with no guess as it was', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    await start(app);
    app.time.advanceTo(MORNING + 7 * MINUTE_MS);
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });

    const [monster] = (await stored(app)).monsters;
    expect(monster).toMatchObject({ number: 1, catchMinutes: 7 });
    expect(monster).not.toHaveProperty('guessMinutes');
  });

  it('is on the card of a monster that arrives after the finish', async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await taskSet(app, { guessMinutes: 30 });
    await start(app);
    app.time.advanceTo(MORNING + 7 * MINUTE_MS);
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    await app.store.dispatch({ type: 'session_closed' });
    expect((await stored(app)).monsters).toEqual([]);

    server.online = true;
    await app.store.dispatch({ type: 'connection_returned' });
    expect((await stored(app)).monsters).toMatchObject([
      { number: 1, catchMinutes: 7, guessMinutes: 30 },
    ]);
  });
});

describe('a line left for next time', () => {
  /** Stopped, the line saved, the task carried on: the phone as it is the next morning. */
  async function nextMorningWithLine(days = 1) {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await taskSet(app);
    await start(app);
    await stopNotFinished(app, MORNING + 4 * MINUTE_MS);
    await app.store.dispatch({
      type: 'session',
      event: { type: 'chose_carry_on' },
      line: `  ${LINE}  `,
    });
    await app.store.dispatch({ type: 'session_closed' });
    const next = await stagedPhone(server, app.data, MORNING + days * DAY_MS);
    return { server, app, next, at: MORNING + days * DAY_MS };
  }

  it('is kept word for word with the day it was written, and the task is carried on', async () => {
    const { app } = await nextMorningWithLine();
    expect((await stored(app)).tasks).toMatchObject([
      { carriedOver: true, status: 'set', nextStart: { text: LINE, writtenOn: '2026-10-06' } },
    ]);
  });

  it('opens the next sitting, labelled yesterday only the day after', async () => {
    const { next, at } = await nextMorningWithLine();
    await start(next);
    const { session, localDate } = next.store.getState();
    if (!session) throw new Error('the sitting started');
    expect(sessionOpening(session, at + 1000, localDate)).toEqual({
      text: LINE,
      label: 'yesterday',
      plain: false,
    });
    // After the first minute it has folded away.
    expect(sessionOpening(session, at + 61_000, localDate)).toBeNull();
  });

  it('still opens the sitting when the app was killed in its first minute', async () => {
    const { server, next, at } = await nextMorningWithLine();
    await start(next);
    const again = await stagedPhone(server, next.data, at + 20_000);
    const { session, localDate } = again.store.getState();
    if (!session) throw new Error('the sitting is still running');
    expect(sessionOpening(session, at + 20_000, localDate)).toMatchObject({ text: LINE });
  });

  it('carries on with no line when the words are empty, as Skip does', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    await start(app);
    await stopNotFinished(app, MORNING + 4 * MINUTE_MS);
    await app.store.dispatch({
      type: 'session',
      event: { type: 'chose_carry_on' },
      line: '   ',
    });

    const [task] = (await stored(app)).tasks;
    expect(task).toMatchObject({ carriedOver: true, status: 'set' });
    expect(task).not.toHaveProperty('nextStart');
  });

  it('is cleared at the catch', async () => {
    const { next, at } = await nextMorningWithLine();
    await start(next);
    next.time.advanceTo(at + 5 * MINUTE_MS);
    await next.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });

    const [task] = (await stored(next)).tasks;
    expect(task).toMatchObject({ status: 'finished' });
    expect(task).not.toHaveProperty('nextStart');
  });

  it('is cleared when the task is made smaller after a sitting', async () => {
    const { next, at } = await nextMorningWithLine();
    await start(next);
    await stopNotFinished(next, at + 4 * MINUTE_MS);
    await next.store.dispatch({ type: 'session', event: { type: 'chose_make_smaller' } });

    const [task] = (await stored(next)).tasks;
    expect(task).toMatchObject({ shrinkCount: 1 });
    expect(task).not.toHaveProperty('nextStart');
  });

  it('is cleared by "too big" before the start, and the sitting does not open on it', async () => {
    const { next } = await nextMorningWithLine();
    await next.store.dispatch({ type: 'too_big' });
    expect((await stored(next)).tasks[0]).not.toHaveProperty('nextStart');

    await start(next);
    const { session, localDate } = next.store.getState();
    if (!session) throw new Error('the sitting started');
    expect(sessionOpening(session, next.time.clock.now(), localDate)).toBeNull();
  });

  it('goes with the task when it is let go', async () => {
    const { next, at } = await nextMorningWithLine();
    await start(next);
    await stopNotFinished(next, at + 4 * MINUTE_MS);
    await next.store.dispatch({ type: 'session', event: { type: 'chose_let_go' } });
    expect((await stored(next)).tasks).toEqual([]);
  });

  it('has no label on any later day', async () => {
    const { next, at } = await nextMorningWithLine(2);
    // Two days on the task waits in the drawer or is today's: either way nothing names the gap.
    const { today, localDate } = next.store.getState();
    if (!('task' in today)) return;
    await start(next);
    const { session } = next.store.getState();
    if (!session) throw new Error('the sitting started');
    expect(sessionOpening(session, at + 1000, localDate)).toMatchObject({ label: null });
  });
});
