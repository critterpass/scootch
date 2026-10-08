import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import { MORNING, recordedStart, stagedPhone, stagedServer } from './test/staged-phone';

const PAGE = 'molar-7f3k9x';
const THING = 'Book the dentist before Thursday';
const OTHER = 'Buy oat milk';

const arrives = { type: 'thing_shared_in', text: THING, when: 'now', monsterPage: PAGE } as const;

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

/** A day that already has its own thing, so whatever arrives waits in the drawer. */
async function dayWithItsThing(server = stagedServer()) {
  const app = await stagedPhone(server);
  await app.say('Water the plants', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  return { server, app };
}

const parkedAs = (app: Phone, text: string) =>
  app.store.getState().drawer.items.find((item) => item.text === text);

describe('the page a thing arrived from, while its words change hands', () => {
  it('is forgotten when the parked thing is reworded', async () => {
    const { server, app } = await dayWithItsThing();
    await app.store.dispatch(arrives);
    const parked = parkedAs(app, THING);
    expect(parked).toBeDefined();

    await app.store.dispatch({
      type: 'drawer_item_edited',
      itemId: parked?.id ?? '',
      text: OTHER,
    });
    const before = server.asked.length;
    await app.store.dispatch({
      type: 'drawer_item_swapped_in',
      itemId: parkedAs(app, OTHER)?.id ?? '',
    });

    expect(app.task().originalText).toBe(OTHER);
    expect(server.asked.length).toBeGreaterThan(before);
    for (const request of server.asked) expect(request).not.toHaveProperty('monsterPage');
  });

  it('is forgotten when the thing waiting for tomorrow is reworded', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch(arrives);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    const taskId = app.task().id;
    await app.store.dispatch({ type: 'hunt_tomorrow', taskId });
    expect(app.store.getState().waitingForTomorrow?.id).toBe(taskId);

    await app.store.dispatch({ type: 'waiting_task_edited', taskId, text: OTHER });
    const before = server.asked.length;
    await app.store.dispatch({ type: 'waiting_task_swapped_in', taskId });
    await app.store.dispatch({ type: 'connection_returned' });

    expect(app.task().originalText).toBe(OTHER);
    expect(server.asked.length).toBeGreaterThan(before);
    for (const request of server.asked.slice(before)) {
      expect(request).not.toHaveProperty('monsterPage');
    }
  });

  it('goes into the drawer with a thing set aside, and comes back when it is swapped in', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch(arrives);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    const words = app.task().originalText;

    await app.store.dispatch({ type: 'task_set_aside' });
    const aside = parkedAs(app, words);
    expect(aside).toBeDefined();
    const before = server.asked.length;
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: aside?.id ?? '' });

    expect(app.task().originalText).toBe(words);
    expect(server.asked.length).toBeGreaterThan(before);
    expect(server.asked.at(-1)).toMatchObject({ monsterPage: PAGE });
  });

  it('goes into the drawer when another thing is swapped in over it, and comes back', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch(arrives);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    const words = app.task().originalText;
    const [other] = app.store.getState().drawer.items;
    expect(other).toBeDefined();

    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: other?.id ?? '' });
    expect(server.asked.at(-1)).not.toHaveProperty('monsterPage');
    const aside = parkedAs(app, words);
    expect(aside).toBeDefined();
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: aside?.id ?? '' });

    expect(app.task().originalText).toBe(words);
    expect(server.asked.at(-1)).toMatchObject({ monsterPage: PAGE });
  });

  it('is named when the thing was finished before any connection', async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await app.store.dispatch(arrives);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    app.time.advanceTo(MORNING + 7 * MINUTE_MS);
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    await app.store.dispatch({ type: 'session_closed' });
    expect(server.asked).toHaveLength(0);

    server.online = true;
    await app.store.dispatch({ type: 'connection_returned' });

    expect(server.asked).toHaveLength(1);
    expect(server.asked[0]).toMatchObject({ text: THING, monsterPage: PAGE });
    const { monsters } = openRepositories(app.data.db);
    expect(await monsters.all()).toMatchObject([{ number: 1 }]);
  });
});

describe('a thing that arrived, cancelled while Scootch was thinking', () => {
  /** The thing arrives, the answer never comes, and the person cancels. */
  async function cancelled() {
    const server = stagedServer({ startStage: () => new Promise<never>(() => undefined) });
    const app = await stagedPhone(server);
    void app.store.dispatch(arrives).catch(() => undefined);
    await app.until(() => app.store.getState().taskCall === 'waiting');
    await app.store.dispatch({ type: 'task_call_cancelled' });
    expect(app.store.getState().returnedText).toBe(THING);
    await app.store.dispatch({ type: 'returned_text_taken' });
    delete server.startStage;
    return { server, app };
  }

  it('still names its page when the words are sent again unchanged', async () => {
    const { server, app } = await cancelled();
    await app.say(THING, 'typed');

    expect(server.asked.at(-1)).toMatchObject({ text: THING, monsterPage: PAGE });
    expect(recordedStart.verdict).toBe('pass');
  });

  it('names no page when other words are sent instead, then or after', async () => {
    const { server, app } = await cancelled();
    await app.say(OTHER, 'typed');
    expect(server.asked.at(-1)).not.toHaveProperty('monsterPage');

    await app.store.dispatch({ type: 'one_thing_cancelled' });
    await app.say(THING, 'typed');
    expect(server.asked.at(-1)).not.toHaveProperty('monsterPage');
  });
});

describe('a page that is already held', () => {
  it('is not taken in twice when its link is opened twice at once', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    const first = app.store.dispatch(arrives);
    const second = app.store.dispatch(arrives);
    await Promise.all([first, second]);

    expect(server.asked).toHaveLength(1);
    expect(app.task().screen).toBe('pass');
    const { tasks, drawerItems } = openRepositories(app.data.db);
    expect(await tasks.all()).toHaveLength(1);
    expect((await drawerItems.all()).map((item) => item.text)).not.toContain(THING);
  });

  it('is not taken in again while today’s thing holds it, or a parked thing does', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch(arrives);
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    const { drawerItems } = openRepositories(app.data.db);
    const parkedBefore = (await drawerItems.all()).length;

    await app.store.dispatch({ ...arrives, text: 'The dentist, Thursday' });
    expect(await drawerItems.all()).toHaveLength(parkedBefore);

    await app.store.dispatch({ type: 'task_set_aside' });
    await app.store.dispatch({ ...arrives, text: 'The dentist, Thursday' });
    expect(await drawerItems.all()).toHaveLength(parkedBefore + 1);
    expect(server.asked).toHaveLength(1);
  });

  it('is taken in again once the thing that held it has been let go', async () => {
    const { server, app } = await dayWithItsThing();
    await app.store.dispatch(arrives);
    await app.store.dispatch({
      type: 'drawer_item_removed',
      itemId: parkedAs(app, THING)?.id ?? '',
    });
    expect(parkedAs(app, THING)).toBeUndefined();

    await app.store.dispatch(arrives);
    const back = parkedAs(app, THING);
    expect(back).toBeDefined();
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: back?.id ?? '' });
    expect(server.asked.at(-1)).toMatchObject({ text: THING, monsterPage: PAGE });
  });
});
