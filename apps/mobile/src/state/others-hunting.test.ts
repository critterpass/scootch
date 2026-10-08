import { describe, expect, it } from '@jest/globals';

import { sessionReducer, sessionSet, type TaskCreateStartResponse } from '@scootch/domain';

import seriousFixture from '../../../../packages/voice/fixtures/task.create.serious.en.json';
import type { HuntingApi } from '../api/hunting-api';
import { openRepositories } from '../data/repositories';
import { defaultSettings } from '../data/repositories/settings';

import type { DayEvent, DayState } from './day-types';
import {
  HUNTING_REFRESH_MS,
  beatFor,
  roundedHunting,
  shownHunting,
  watchHunting,
} from './others-hunting';
import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

/** The two routes at the network boundary: what was sent, and what the count answers. */
interface HuntingServer {
  readonly beats: boolean[];
  count: number | null;
  beatFails: boolean;
  readonly api: HuntingApi;
}

function huntingServer(count: number | null = 214): HuntingServer {
  const beats: boolean[] = [];
  const server: HuntingServer = {
    beats,
    count,
    beatFails: false,
    api: {
      beat: (hunting) => {
        beats.push(hunting);
        return server.beatFails ? Promise.reject(new Error('offline')) : Promise.resolve();
      },
      count: () =>
        server.count === null
          ? Promise.reject(new Error('offline'))
          : Promise.resolve(server.count),
    },
  };
  return server;
}

const NO_TABLE = { getState: () => ({ tableId: null }), subscribe: () => () => undefined };
const settled = () => new Promise((done) => setTimeout(done, 0));

function watch(app: Phone, server: HuntingServer) {
  const shown: (number | null)[] = [];
  const stop = watchHunting({
    store: app.store,
    table: NO_TABLE,
    api: server.api,
    timers: app.time.timers,
    show: (count) => shown.push(count),
  });
  return { shown, stop, last: () => shown.at(-1) ?? null };
}

const SET: DayEvent = { type: 'session_set', minutes: 10 };
const STARTED: DayEvent = { type: 'session', event: { type: 'started' } };
const LEFT: DayEvent = { type: 'session', event: { type: 'left' } };

async function taskSet(app: Phone): Promise<void> {
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
}

describe('the count as it is written', () => {
  it('keeps three figures: the number under a thousand, then rounds the rest away', () => {
    expect(roundedHunting(20)).toBe(20);
    expect(roundedHunting(214)).toBe(214);
    expect(roundedHunting(999)).toBe(999);
    expect(roundedHunting(1238)).toBe(1240);
    expect(roundedHunting(12_384)).toBe(12_400);
    expect(roundedHunting(99_960)).toBe(100_000);
  });

  it('is absent offline, on a serious task, under twenty, at a table and when switched off', () => {
    const on = { count: 214, serious: false, atTable: false, settings: { othersHunting: true } };
    expect(shownHunting(on)).toBe(214);
    expect(shownHunting({ ...on, settings: {} })).toBe(214);
    expect(shownHunting({ ...on, count: null })).toBeNull();
    expect(shownHunting({ ...on, serious: true })).toBeNull();
    expect(shownHunting({ ...on, count: 19 })).toBeNull();
    expect(shownHunting({ ...on, count: 0 })).toBeNull();
    expect(shownHunting({ ...on, atTable: true })).toBeNull();
    expect(shownHunting({ ...on, settings: { othersHunting: false } })).toBeNull();
  });
});

describe('the beat', () => {
  it('says a session began and ended, and shows the count read once it began', async () => {
    const app = await stagedPhone(stagedServer());
    const server = huntingServer();
    const footer = watch(app, server);
    await taskSet(app);
    await app.store.dispatch(SET);
    expect(server.beats).toEqual([]);

    await app.store.dispatch(STARTED);
    await settled();
    expect(server.beats).toEqual([true]);
    expect(footer.last()).toBe(214);

    // Read again once a minute.
    server.count = 1238;
    app.time.advanceTo(MORNING + HUNTING_REFRESH_MS);
    await settled();
    expect(footer.last()).toBe(1240);

    // Offline: the line goes, rather than showing an old number or nought.
    server.count = null;
    app.time.advanceTo(MORNING + 2 * HUNTING_REFRESH_MS);
    await settled();
    expect(footer.last()).toBeNull();

    server.count = 214;
    await app.store.dispatch(LEFT);
    await settled();
    expect(server.beats).toEqual([true, false]);
    expect(footer.last()).toBeNull();
    footer.stop();
  });

  it('changes nothing in the session when it fails, and is not sent again', async () => {
    const app = await stagedPhone(stagedServer());
    const server = huntingServer();
    server.beatFails = true;
    const footer = watch(app, server);
    await taskSet(app);
    await app.store.dispatch(SET);
    await app.store.dispatch(STARTED);
    await settled();
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
    app.time.advanceTo(MORNING + 3 * HUNTING_REFRESH_MS);
    await settled();
    expect(server.beats).toEqual([true]);
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
    footer.stop();
  });

  it('is never sent when "others hunting" is off, and nothing is shown', async () => {
    const app = await stagedPhone(stagedServer());
    const server = huntingServer();
    const footer = watch(app, server);
    await app.store.dispatch({ type: 'settings_changed', changes: { othersHunting: false } });
    await taskSet(app);
    await app.store.dispatch(SET);
    await app.store.dispatch(STARTED);
    await settled();
    await app.store.dispatch(LEFT);
    await settled();
    expect(server.beats).toEqual([]);
    expect(footer.shown.filter((count) => count !== null)).toEqual([]);
    footer.stop();
  });

  it('is never sent for a serious task', async () => {
    const serious = seriousFixture.response as TaskCreateStartResponse;
    const app = await stagedPhone(stagedServer({ start: serious }));
    const server = huntingServer();
    const footer = watch(app, server);
    await app.say('Sort out the letter from the council', 'typed');
    expect(app.store.getState().today.kind).toBe('serious');
    await app.store.dispatch(SET);
    await app.store.dispatch(STARTED);
    await settled();
    expect(app.store.getState().session).toMatchObject({ phase: 'running', tone: 'quiet' });
    await app.store.dispatch(LEFT);
    await settled();
    expect(server.beats).toEqual([]);
    expect(footer.shown.filter((count) => count !== null)).toEqual([]);
    footer.stop();
  });

  it('is never sent on a crisis day, and ends a counted session the day turns to a crisis', () => {
    const settings = defaultSettings('en');
    const set = sessionSet({ taskId: 'task', tone: 'full', minutes: 10 });
    const running = sessionReducer(set, { type: 'started' }, MORNING).state;
    const day = (today: DayState['today']) => ({ session: running, today, settings });
    const crisis = { kind: 'crisis' } as const;
    expect(beatFor(false, day(crisis))).toBeNull();
    expect(beatFor(true, day(crisis))).toBe(false);
  });
});

describe('the helper settings', () => {
  it('read back as they were written', async () => {
    const app = await stagedPhone(stagedServer());
    await app.store.dispatch({
      type: 'settings_changed',
      changes: { coffeeAt: '08:20', bedAt: '23:10', getReadyLeadMinutes: 45, othersHunting: false },
    });
    const stored = await openRepositories(app.data.db).settings.read('en');
    expect(stored).toMatchObject({
      coffeeAt: '08:20',
      lunchAt: '13:10',
      bedAt: '23:10',
      getReadyLeadMinutes: 45,
      othersHunting: false,
    });
    expect(app.store.getState().settings).toMatchObject({
      getReadyLeadMinutes: 45,
      othersHunting: false,
    });
  });
});
