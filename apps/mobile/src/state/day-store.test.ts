import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  MINUTE_MS,
  type SessionEvent,
  type TaskCreatePass,
  type TaskCreateResponse,
} from '@scootch/domain';
import { offlinePacks } from '@scootch/voice';

import crisisFixture from '../../../../packages/voice/fixtures/task.create.crisis.en.json';
import passFixture from '../../../../packages/voice/fixtures/task.create.en.json';
import { createTaskClient, type TaskClient } from '../api/task-client';
import { openRepositories } from '../data/repositories';
import { openTestDatabase, type TestDatabase } from '../data/test/open-test-database';
import { createEffectsRunner } from '../effects/effects-runner';
import { ALL_ON, fakeDevice, fakeTime } from '../effects/test/fake-adapters';

import { createDayStore, type DayStore } from './day-store';

// 10:00 on 6 October in London, the day and zone of the recorded task call.
const MORNING = Date.parse('2026-10-06T09:00:00.000Z');
const pass = passFixture.response as TaskCreatePass;
const plain = offlinePacks.en.plain;

interface Server {
  online: boolean;
  /** What the task call answers; `null` makes it fail. */
  answer: TaskCreateResponse | null;
  calls: number;
}

/** A phone: one database that outlives the app, and an app process that can be started on it again. */
async function phone(server: Server, database?: TestDatabase, at = MORNING) {
  const data = database ?? (await openTestDatabase());
  const time = fakeTime(at);
  const device = fakeDevice();
  let ids = 0;
  const tasks: TaskClient = createTaskClient({
    screenInput: () => Promise.reject(new Error('not used')),
    taskCreate: () => {
      server.calls += 1;
      return server.answer ? Promise.resolve(server.answer) : Promise.reject(new Error('down'));
    },
  });
  const runner = createEffectsRunner({
    clock: time.clock,
    timers: time.timers,
    cues: device.cues,
    haptics: device.haptics,
    notifications: device.notifications,
    liveActivity: device.liveActivity,
    screen: {
      showLine: (slot, text) => store.screen.showLine(slot, text),
      showBurst: (burst) => store.screen.showBurst(burst),
      handOverTreat: (treat) => store.screen.handOverTreat(treat),
      showParkedThoughts: (thoughts) => store.screen.showParkedThoughts(thoughts),
    },
    switches: () => ALL_ON,
    onClock: () => void store.dispatch({ type: 'session', event: { type: 'clock' } }),
  });
  const store: DayStore = createDayStore({
    repositories: openRepositories(data.db),
    clock: time.clock,
    timeZone: () => 'Europe/London',
    nextId: () => `id-${at}-${(ids += 1)}`,
    tasks,
    online: () => Promise.resolve(server.online),
    runner,
    phoneLanguage: () => 'en',
    plus: () => false,
    timers: time.timers,
  });
  await store.start();
  const session = (event: SessionEvent) => store.dispatch({ type: 'session', event });
  const type = (text: string, source: 'typed' | 'ramble' = 'typed') =>
    store.dispatch({ type: 'text_submitted', text, source, energy: 'medium' });
  return { data, time, device, store, runner, session, type };
}

const taskOf = (store: DayStore) => {
  const { today } = store.getState();
  if (!('task' in today)) throw new Error(`no task today: ${today.kind}`);
  return today.task;
};

describe('the day store', () => {
  it('writes what the task call answers: the one thing, its monster, the parked rest and the plan', async () => {
    // Half past nine, so the whole plan for the day is still ahead.
    const opened = MORNING - 30 * MINUTE_MS;
    const app = await phone({ online: true, answer: pass, calls: 0 }, undefined, opened);
    await app.type(passFixture.request.text, 'ramble');
    await app.runner.settled();

    const state = app.store.getState();
    expect(state.today.kind).toBe('task_set');
    expect(taskOf(app.store)).toMatchObject({
      text: pass.oneThing.text,
      screen: 'pass',
      status: 'set',
    });
    expect(state.monster).toMatchObject({ name: pass.monster.name, caughtAt: null });
    expect(state.monsterPending).toBe(false);
    expect(state.line).toEqual({ slot: 'hatch', text: pass.lines.hatch });
    expect(state.drawer.items.map((item) => item.text)).toEqual(
      expect.arrayContaining([...pass.parked.map((one) => one.text), 'Council tax']),
    );
    expect(state.drawer.open).toBe(false);
    // Cheeky allows up to three, all after ten in the morning and in the task's own words.
    const scheduled = app.device.scheduled();
    const today = scheduled.filter((one) => one.at < MORNING + 12 * 60 * 60_000);
    expect(today.map((one) => one.text)).toEqual(pass.notifications.map((one) => one.text));
    expect(scheduled.every((one) => one.at >= MORNING)).toBe(true);
    expect(today.length).toBeGreaterThan(0);
    // The days after are planned too, in case the app stays shut, and never in the task's words.
    const later = scheduled.slice(today.length).map((one) => one.text);
    expect(later.length).toBeGreaterThan(0);
    for (const text of later) expect(pass.notifications.map((one) => one.text)).not.toContain(text);
  });

  it('falls back with no connection: the typed text unchanged, plain company, a monster pending', async () => {
    const server: Server = { online: false, answer: pass, calls: 0 };
    const app = await phone(server);
    await app.type('email the dentist about tuesday');

    expect(server.calls).toBe(0);
    expect(taskOf(app.store)).toMatchObject({
      text: 'email the dentist about tuesday',
      screen: 'unscreened',
      lines: null,
    });
    expect(app.store.getState()).toMatchObject({ monster: null, monsterPending: true, line: null });
    // Nothing today, and nothing louder than the soft voice on the days after: no joke before
    // the screen.
    const scheduled = app.device.scheduled();
    expect(scheduled.every((one) => one.at > MORNING + 12 * 60 * 60_000)).toBe(true);
    for (const one of scheduled) {
      expect(offlinePacks.en.lines.soft.notification).toContain(one.text);
    }

    // The session still runs, and what Scootch says is the offline pack's plain words.
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.session({ type: 'started' });
    expect(app.store.getState().line?.text).toBe(plain.acknowledge);
    expect(app.store.getState().today.kind).toBe('in_session');

    // The connection returns: the task is screened, keeps its words and gets its monster.
    server.online = true;
    await app.store.dispatch({ type: 'connection_returned' });
    expect(taskOf(app.store)).toMatchObject({
      text: 'email the dentist about tuesday',
      screen: 'pass',
      lines: pass.lines,
    });
    expect(app.store.getState()).toMatchObject({ monsterPending: false });
    expect(app.store.getState().monster?.name).toBe(pass.monster.name);
  });

  it('shows nothing funny for a task the gate held when the server never answers', async () => {
    const server: Server = { online: true, answer: null, calls: 0 };
    const app = await phone(server);
    const waited: string[] = [];
    app.store.subscribe(() => waited.push(app.store.getState().taskCall));

    await app.type('call the oncologist back about my biopsy results');
    expect(server.calls).toBe(1);
    expect(waited).toContain('held');
    expect(waited).not.toContain('waiting');

    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: 'tea' });
    expect(app.store.getState().session).toMatchObject({ tone: 'quiet' });
    await app.session({ type: 'started' });
    await app.session({ type: 'finish_tapped' });

    expect(app.store.getState().monster).toBeNull();
    expect(app.store.getState().burst).toBeNull();
    expect(app.device.calls.bursts).toEqual([]);
    expect(app.device.calls.cues).toEqual(['quiet-finish']);
    expect(app.store.getState().line?.text).toBe(plain.done);
    expect(app.store.getState().today.kind).toBe('done_for_today');
  });

  it('writes a crisis text nowhere, whether the phone or the server catches it', async () => {
    const server: Server = { online: true, answer: pass, calls: 0 };
    const caughtOnPhone = await phone(server);
    await caughtOnPhone.type('I want to kill myself', 'ramble');
    expect(server.calls).toBe(0);
    expect(caughtOnPhone.store.getState().today).toEqual({ kind: 'crisis' });
    expect(caughtOnPhone.data.dump()).not.toContain('myself');
    expect(caughtOnPhone.data.count('tasks') + caughtOnPhone.data.count('ramble_transcripts')).toBe(
      0,
    );

    const caughtByServer = await phone({
      online: true,
      answer: crisisFixture.response as TaskCreateResponse,
      calls: 0,
    });
    await caughtByServer.type('writing letters and finding a home for the cat', 'ramble');
    expect(caughtByServer.store.getState().today).toEqual({ kind: 'crisis' });
    expect(caughtByServer.data.dump()).not.toContain('letters');
    expect(caughtByServer.store.getState().monster).toBeNull();

    // The day stays hidden after a relaunch, and nothing more is taken in.
    const again = await phone(server, caughtByServer.data);
    await again.type('buy milk');
    expect(again.store.getState().today).toEqual({ kind: 'crisis' });
    expect(again.data.count('tasks')).toBe(0);
  });

  it('rebuilds the same day and session from storage after the app is killed', async () => {
    const server: Server = { online: true, answer: pass, calls: 0 };
    const first = await phone(server);
    await first.type(passFixture.request.text, 'ramble');
    await first.store.dispatch({ type: 'session_set', minutes: 25, treat: 'a coffee' });
    await first.session({ type: 'started' });
    first.time.advanceTo(MORNING + 3 * MINUTE_MS);
    await first.session({ type: 'thought_parked', text: 'buy washers' });
    first.time.advanceTo(MORNING + 5 * MINUTE_MS);
    await first.session({ type: 'clock' });
    const before = first.store.getState();

    // Killed. A new process starts on the same database five minutes into the session.
    const second = await phone(server, first.data, MORNING + 5 * MINUTE_MS);
    await second.runner.settled();
    const after = second.store.getState();

    expect(after.ready).toBe(true);
    expect(after.today).toEqual(before.today);
    expect(after.session).toEqual(before.session);
    expect(after.monster).toEqual(before.monster);
    expect(after.drawer).toEqual(before.drawer);
    expect(after.localDate).toBe('2026-10-06');

    // Nothing is started or granted twice: one session row, no second burst, cue or activity.
    expect(second.data.count('sessions')).toBe(1);
    expect(second.device.calls.cues).toEqual([]);
    expect(second.device.calls.bursts).toEqual([]);
    expect(second.device.calls.live).toEqual([]);
    expect(server.calls).toBe(1);

    // The timer is the stored end time: it comes due twenty-five minutes after the first start.
    second.time.advanceTo(MORNING + 25 * MINUTE_MS);
    await second.store.dispatch({ type: 'session', event: { type: 'clock' } });
    expect(second.store.getState().session).toMatchObject({ phase: 'time_up' });
  });

  it('leaves no row behind when a task is let go, and still hands over the parked thoughts', async () => {
    const app = await phone({ online: true, answer: pass, calls: 0 });
    await app.type('call the plumber');
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.session({ type: 'started' });
    await app.session({ type: 'thought_parked', text: 'buy washers' });
    app.time.advanceTo(MORNING + 10 * MINUTE_MS);
    await app.session({ type: 'not_finished' });
    await app.session({ type: 'chose_let_go' });

    for (const table of ['tasks', 'monsters', 'sessions', 'parked_thoughts']) {
      expect([table, app.data.count(table)]).toEqual([table, 0]);
    }
    expect(app.data.dump()).not.toContain('plumber about');
    expect(app.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 3 });
    expect(app.store.getState().parkedThoughts.map((one) => one.text)).toEqual(['buy washers']);
  });

  it('drops a ramble transcript at the pick, or keeps it seven days when the person asks', async () => {
    const server: Server = { online: true, answer: pass, calls: 0 };
    const app = await phone(server);
    await app.type(passFixture.request.text, 'ramble');
    expect(app.data.count('ramble_transcripts')).toBe(1);
    await app.store.dispatch({ type: 'one_thing_picked' });
    expect(app.data.count('ramble_transcripts')).toBe(0);

    const keeper = await phone(server);
    await keeper.store.dispatch({ type: 'settings_changed', changes: { keepTranscripts: true } });
    await keeper.type(passFixture.request.text, 'ramble');
    await keeper.store.dispatch({ type: 'one_thing_picked' });
    expect(keeper.data.count('ramble_transcripts')).toBe(1);

    await phone(server, keeper.data, MORNING + 6 * DAY_MS);
    expect(keeper.data.count('ramble_transcripts')).toBe(1);
    await phone(server, keeper.data, MORNING + 7 * DAY_MS);
    expect(keeper.data.count('ramble_transcripts')).toBe(0);
  });
});
