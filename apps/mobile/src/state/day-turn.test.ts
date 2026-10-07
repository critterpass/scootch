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

describe('a session running across the start of a new day', () => {
  async function runningBefore() {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 25 });
    app.time.jumpTo(BOUNDARY - 5 * 60_000);
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    return app;
  }

  it('survives the app coming forward after four, and the day turns once it is over', async () => {
    const app = await runningBefore();
    await app.store.dispatch({ type: 'app_backgrounded' });
    app.time.jumpTo(BOUNDARY + 2 * 60_000);
    await app.store.dispatch({ type: 'app_foregrounded' });
    expect(app.store.getState()).toMatchObject({
      localDate: '2026-10-06',
      today: { kind: 'in_session' },
      session: { phase: 'running' },
    });

    // It is finished on the day it was started, and its screens are shown to the end.
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState()).toMatchObject({
      localDate: '2026-10-06',
      session: { phase: 'finished' },
    });
    expect(app.data.dump().includes('"caught_on":"2026-10-06"')).toBe(true);

    // Then the turn that was put off is applied, without waiting for anything else.
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState()).toMatchObject({
      localDate: '2026-10-07',
      today: { kind: 'nothing_yet', startsLeft: FREE_STARTS_PER_DAY },
      session: null,
    });
  });

  it('survives in any zone, however far past four the clock is when the app comes forward', async () => {
    const app = await stagedPhone(stagedServer(), undefined, MORNING, { timeZone: 'Asia/Tokyo' });
    // 18:00 in Tokyo, then six the next morning.
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'session_set', minutes: 25 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    const day = app.store.getState().localDate;
    app.time.jumpTo(MORNING + 12 * HOUR_MS);
    await app.store.dispatch({ type: 'app_foregrounded' });
    expect(app.store.getState()).toMatchObject({ localDate: day, today: { kind: 'in_session' } });
  });
});

describe('rebuilding today while the app is open', () => {
  it('keeps the one screen mounted, so nothing typed or held is lost to a day turn', async () => {
    const app = await stagedPhone(stagedServer());
    const ready: boolean[] = [];
    app.store.subscribe(() => ready.push(app.store.getState().ready));
    app.time.jumpTo(BOUNDARY + 1000);
    await app.store.dispatch({ type: 'day_turned' });
    expect(app.store.getState().localDate).toBe('2026-10-07');
    expect(ready).not.toContain(false);
  });

  it('stops the timers and the Live Activity of a session that is gone', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'session_set', minutes: 25 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.time.armed().length).toBeGreaterThan(0);

    // Everything is erased under the running session, as "delete everything" does.
    for (const table of app.data.tableNames()) {
      await app.data.db.runAsync(`DELETE FROM ${table}`, []);
    }
    await app.store.dispatch({ type: 'storage_replaced' });
    expect(app.store.getState().session).toBeNull();
    expect(app.time.armed()).toEqual([]);
    expect(app.device.calls.live.at(-1)).toBe('end');
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
