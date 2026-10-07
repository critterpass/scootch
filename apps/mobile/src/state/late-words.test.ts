import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../data/repositories';

import { MORNING, ramble, recordedStart, stagedPhone, stagedServer } from './test/staged-phone';

if (recordedStart.verdict !== 'pass') throw new Error('the recorded call is an ordinary one');
const oneThing = recordedStart.oneThing.text;
const others = [...recordedStart.parked, ...recordedStart.deadlines].map((one) => one.text);

// A ramble longer than a task may be, with the recorded one at its end.
const filler = 'and then there is the thing with the car and the other thing with the shed, ';
const longRamble = `${filler.repeat(4)}${ramble}`;

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
