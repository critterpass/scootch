import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  FREE_STARTS_PER_DAY,
  HOUR_MS,
  nextScootchDayStart,
  type TaskCreateStartResponse,
} from '@scootch/domain';

import crisisFixture from '../../../../packages/voice/fixtures/task.create.crisis.en.json';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

// 04:00 on 7 October in London, the start of the next Scootch day.
const BOUNDARY = nextScootchDayStart(MORNING, 'Europe/London');

describe('a day left open overnight', () => {
  it('turns at four in the morning on the local clock', () => {
    expect(new Date(BOUNDARY).toISOString()).toBe('2026-10-07T03:00:00.000Z');
    expect(nextScootchDayStart(BOUNDARY - 1, 'Europe/London')).toBe(BOUNDARY);
    expect(nextScootchDayStart(BOUNDARY, 'Europe/London')).toBe(BOUNDARY + DAY_MS);
  });

  it('ends a crisis day at the boundary without the app being closed', async () => {
    const server = stagedServer({ start: crisisFixture.response as TaskCreateStartResponse });
    const app = await stagedPhone(server);
    await app.say('writing letters and finding a home for the cat');
    expect(app.store.getState().today).toEqual({ kind: 'crisis' });

    // Before the boundary nothing changes, whatever is sent.
    app.time.jumpTo(BOUNDARY - 1);
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState().today).toEqual({ kind: 'crisis' });

    app.time.jumpTo(BOUNDARY + 1000);
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState()).toMatchObject({
      localDate: '2026-10-07',
      today: { kind: 'nothing_yet', startsLeft: FREE_STARTS_PER_DAY },
    });
  });

  it('carries a set task into the new day, and leaves a running session alone', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    const { id } = app.task();
    await app.store.dispatch({ type: 'session_set', minutes: 50 });
    app.time.jumpTo(BOUNDARY - HOUR_MS / 2);
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });

    app.time.jumpTo(BOUNDARY + 1000);
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState()).toMatchObject({
      localDate: '2026-10-06',
      today: { kind: 'in_session' },
    });

    await app.store.dispatch({ type: 'session', event: { type: 'left' } });
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState().localDate).toBe('2026-10-07');
    expect(app.task()).toMatchObject({ id, carriedOver: true, status: 'set' });
  });
});

describe('a failure inside the store', () => {
  it('is reported and said in one plain line, never swallowed, and clears on the next thing done', async () => {
    const reported: unknown[] = [];
    const app = await stagedPhone(stagedServer(), undefined, MORNING, {
      onFailure: (error) => reported.push(error),
    });
    const sent = app.store.dispatch({
      type: 'settings_changed',
      changes: { attitude: 'not-an-attitude' as never },
    });
    await expect(sent).rejects.toBeDefined();
    expect(reported).toHaveLength(1);
    expect(app.store.getState().notice).toBe('failed');

    // The app goes on working, and the line leaves with the next thing the person does.
    await app.store.dispatch({ type: 'drawer', event: { type: 'pulled' } });
    expect(app.store.getState()).toMatchObject({ notice: null, drawer: { open: true } });
  });
});
