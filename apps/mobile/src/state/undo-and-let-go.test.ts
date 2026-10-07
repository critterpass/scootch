import { describe, expect, it } from '@jest/globals';

import { DAY_MS, MINUTE_MS, type SessionEvent } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;
const session = (app: Phone, event: SessionEvent) => app.store.dispatch({ type: 'session', event });

async function taskSet(text = 'ring the bank'): Promise<Phone> {
  const app = await stagedPhone(stagedServer());
  await app.say(text, 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  return app;
}

async function started(): Promise<Phone> {
  const app = await taskSet();
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await session(app, { type: 'started' });
  return app;
}

describe('letting a thing go', () => {
  it('does not hand back the start its session used, today', async () => {
    const app = await started();
    app.time.advanceTo(MORNING + 4 * MINUTE_MS);
    await session(app, { type: 'not_finished' });
    await session(app, { type: 'chose_let_go' });
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 2 });
    expect(app.data.count('tasks') + app.data.count('sessions')).toBe(0);

    // It is still used after the app is opened again, and the next day starts whole.
    const again = await stagedPhone(stagedServer(), app.data, MORNING + 30 * MINUTE_MS);
    expect(again.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 2 });
    const tomorrow = await stagedPhone(stagedServer(), app.data, MORNING + DAY_MS);
    expect(tomorrow.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 3 });
  });
});

describe('"Not finished", then "Changed my mind"', () => {
  it('is back in the running session, stored as running, and can still be finished', async () => {
    const app = await started();
    app.time.advanceTo(MORNING + 4 * MINUTE_MS);
    await session(app, { type: 'not_finished' });
    const { sessions } = openRepositories(app.data.db);
    expect(await sessions.all()).toMatchObject([{ outcome: 'not_finished', endedAt: null }]);

    await session(app, { type: 'mind_changed' });
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
    expect(await sessions.all()).toMatchObject([{ outcome: null, endedAt: null }]);
    // A relaunch finds the session running, not the three choices.
    const again = await stagedPhone(stagedServer(), app.data, MORNING + 5 * MINUTE_MS);
    expect(again.store.getState().session).toMatchObject({ phase: 'running' });

    await session(app, { type: 'double_tapped' });
    expect(app.store.getState().session).toMatchObject({ phase: 'finished' });
    expect(app.data.count('world_pieces')).toBe(1);
  });
});

describe('"That\'s it for today", then "Changed my mind"', () => {
  it('brings the one thing back to today exactly as it was', async () => {
    const app = await taskSet();
    const before = app.task();
    await app.store.dispatch({ type: 'done_for_today' });
    expect(app.store.getState()).toMatchObject({
      today: { kind: 'done_for_today' },
      restUndo: true,
    });

    await app.store.dispatch({ type: 'rest_undone' });
    expect(app.task()).toEqual(before);
    expect(app.store.getState()).toMatchObject({
      today: { kind: 'task_set', startsLeft: 3 },
      waitingForTomorrow: null,
      restUndo: false,
    });
  });

  it('is still offered after the app is opened again that day, and not the day after', async () => {
    const app = await taskSet();
    const before = app.task();
    await app.store.dispatch({ type: 'done_for_today' });
    const again = await stagedPhone(stagedServer(), app.data, MORNING + 60 * MINUTE_MS);
    expect(again.store.getState().restUndo).toBe(true);
    await again.store.dispatch({ type: 'rest_undone' });
    expect(again.task()).toEqual(before);

    await again.store.dispatch({ type: 'done_for_today' });
    const tomorrow = await stagedPhone(stagedServer(), app.data, MORNING + DAY_MS);
    expect(tomorrow.store.getState().restUndo).toBe(false);
    expect(tomorrow.task()).toMatchObject({ id: before.id, carriedOver: true });
  });

  it('opens a day that was rested with nothing on it', async () => {
    const app = await stagedPhone(stagedServer());
    await app.store.dispatch({ type: 'done_for_today' });
    expect(app.store.getState().restUndo).toBe(true);
    await app.store.dispatch({ type: 'rest_undone' });
    expect(app.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 3 });
  });

  it('is not offered for a thing carried on after a session', async () => {
    const app = await started();
    await session(app, { type: 'not_finished' });
    await session(app, { type: 'chose_carry_on' });
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().restUndo).toBe(false);
  });
});
