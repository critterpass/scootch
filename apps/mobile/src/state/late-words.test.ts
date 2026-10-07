import { describe, expect, it } from '@jest/globals';

import type { TaskCreateStartResponse } from '@scootch/domain';

import type { Judged } from '../api/scootch-api';
import { openRepositories } from '../data/repositories';

import { TASK_PATIENCE_MS } from './task-flow';
import { MORNING, ramble, recordedStart, stagedPhone, stagedServer } from './test/staged-phone';

if (recordedStart.verdict !== 'pass') throw new Error('the recorded call is an ordinary one');
const oneThing = recordedStart.oneThing.text;
const others = [...recordedStart.parked, ...recordedStart.deadlines].map((one) => one.text);

// A ramble longer than a task may be, with the recorded one at its end.
const filler = 'and then there is the thing with the car and the other thing with the shed, ';
const longRamble = `${filler.repeat(4)}${ramble}`;

/** Lets what is already under way reach its next wait. */
const flush = () => new Promise<void>((done) => setImmediate(done));
const drawerTexts = (app: Awaited<ReturnType<typeof stagedPhone>>) =>
  app.store.getState().drawer.items.map((item) => item.text);

describe('words sent while the model cannot answer', () => {
  it('are all kept, and the rest is parked once the answer comes', async () => {
    const offline = await stagedPhone(stagedServer({ online: false }));
    await offline.say(longRamble);
    const task = offline.task();
    // The one thing fits a task and ends on a whole word; nothing of the ramble is thrown away.
    expect(task.text.length).toBeLessThanOrEqual(280);
    expect(longRamble.startsWith(task.text)).toBe(true);
    expect(longRamble.charAt(task.text.length)).toBe(' ');
    const kept = await openRepositories(offline.data.db).unsortedWords.all();
    expect(kept).toEqual([{ taskId: task.id, text: longRamble }]);
    await offline.store.dispatch({ type: 'one_thing_picked' });

    // The app is opened again with a connection: the whole ramble is asked about.
    const server = stagedServer();
    const online = await stagedPhone(server, offline.data, MORNING + 60_000);
    expect(server.startCalls).toBe(1);
    expect(drawerTexts(online)).toEqual(expect.arrayContaining(others));
    expect(online.task()).toMatchObject({ id: task.id, text: oneThing });
    expect(await openRepositories(online.data.db).unsortedWords.all()).toEqual([]);
  });

  it('keep a started task in the words it was started with, and still park the rest', async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await app.say(longRamble);
    const { text } = app.task();
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });

    server.online = true;
    app.time.advanceTo(MORNING + 120_000);
    await app.store.dispatch({ type: 'connection_returned' });
    expect(app.task().text).toBe(text);
    expect(drawerTexts(app)).toEqual(expect.arrayContaining(others));
  });

  it('park their rest even when their task has been let go of meanwhile', async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await app.say(longRamble);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await openRepositories(app.data.db).forgetTask(app.task().id);

    server.online = true;
    await app.store.dispatch({ type: 'connection_returned' });
    expect(drawerTexts(app)).toEqual(expect.arrayContaining(others));
    expect(await openRepositories(app.data.db).unsortedWords.all()).toEqual([]);
  });
});

describe('"Another"', () => {
  it('leaves the offered thing where it is with no connection', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.say('ring the bank', 'typed');
    const offered = app.task();
    const { monster } = app.store.getState();

    server.online = false;
    // Everything parked from these words has been offered already.
    for (const item of app.store.getState().drawer.items) {
      await openRepositories(app.data.db).drawerItems.remove(item.id);
    }
    await app.store.dispatch({ type: 'another_asked' });
    expect(app.task()).toEqual(offered);
    expect(app.store.getState().monster).toEqual(monster);
    expect(app.store.getState()).toMatchObject({
      taskCall: 'idle',
      pick: { kind: 'offered', another: false },
    });
  });

  it('puts the offered thing back, monster and all, when the model does not answer in time', async () => {
    const waiting: ((start: TaskCreateStartResponse & Judged) => void)[] = [];
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.say('ring the bank', 'typed');
    const offered = app.task();
    const { monster } = app.store.getState();
    expect(monster).not.toBeNull();
    for (const item of app.store.getState().drawer.items) {
      await openRepositories(app.data.db).drawerItems.remove(item.id);
    }

    server.startStage = () => new Promise((resolve) => waiting.push(resolve));
    const asked = app.store.dispatch({ type: 'another_asked' });
    await app.until(() => app.store.getState().taskCall === 'waiting');
    await flush();
    app.time.advanceTo(MORNING + TASK_PATIENCE_MS);
    await asked;
    expect(app.task()).toEqual(offered);
    expect(app.store.getState().monster).toEqual(monster);
    expect(app.store.getState()).toMatchObject({
      taskCall: 'idle',
      modelDown: true,
      pick: { kind: 'offered', another: false },
    });
    expect(app.data.count('tasks')).toBe(1);
  });
});
