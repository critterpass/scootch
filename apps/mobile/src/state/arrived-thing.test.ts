import { describe, expect, it } from '@jest/globals';

import { stagedPhone, stagedServer } from './test/staged-phone';

const PAGE = 'molar-7f3k9x';
const THING = 'Book the dentist before Thursday';

const arrives = { type: 'thing_shared_in', text: THING, when: 'now', monsterPage: PAGE } as const;

describe('a thing that arrives from a monster made on the website', () => {
  it('names the monster on its task call, and no other call names it', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch(arrives);

    expect(server.asked).toHaveLength(1);
    expect(server.asked[0]).toMatchObject({ text: THING, monsterPage: PAGE });
    expect(app.task().screen).toBe('pass');

    // The next thing typed is the person's own, and says nothing of any monster.
    await app.say('Water the plants', 'typed');
    expect(server.asked).toHaveLength(2);
    expect(server.asked[1]).not.toHaveProperty('monsterPage');
  });

  it('is asked for as any shared thing is when it names no monster', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch({ type: 'thing_shared_in', text: THING, when: 'now' });

    expect(server.asked).toHaveLength(1);
    expect(server.asked[0]).not.toHaveProperty('monsterPage');
  });

  it('still names it when the call is first made after a relaunch', async () => {
    const away = stagedServer({ online: false });
    const first = await stagedPhone(away);
    await first.store.dispatch(arrives);
    expect(away.asked).toHaveLength(0);
    expect(first.task().screen).toBe('unscreened');

    // The app is opened again with a connection: the waiting thing is asked for, with its page.
    const server = stagedServer();
    const app = await stagedPhone(server, first.data);
    expect(server.asked).toHaveLength(1);
    expect(server.asked[0]).toMatchObject({ text: THING, monsterPage: PAGE });
    expect(app.task().screen).toBe('pass');
  });

  it('names it again when the monster had not come before a relaunch', async () => {
    // The first stage answers and the rest is still on its way when the app is closed: the task
    // is set, with no monster yet.
    const never = () => new Promise<never>(() => undefined);
    const first = await stagedPhone(stagedServer({ name: never, lines: never }));
    void first.store.dispatch(arrives);
    await first.until(() => first.store.getState().today.kind === 'task_set');
    expect(first.data.count('monsters')).toBe(0);

    const server = stagedServer();
    const app = await stagedPhone(server, first.data);
    expect(server.asked).toHaveLength(1);
    expect(server.asked[0]).toMatchObject({ monsterPage: PAGE });
    expect(app.store.getState().monster).not.toBeNull();
  });

  it('waits in the drawer with its page on a day that has its thing, and names it when swapped in', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.say('Water the plants', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    const before = server.asked.length;

    await app.store.dispatch(arrives);
    expect(server.asked).toHaveLength(before);
    const parked = app.store.getState().drawer.items.find((item) => item.text === THING);
    expect(parked).toBeDefined();

    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: parked?.id ?? '' });
    expect(app.task().originalText).toBe(THING);
    expect(server.asked.length).toBeGreaterThan(before);
    expect(server.asked.at(-1)).toMatchObject({ text: THING, monsterPage: PAGE });
    // Only the thing that arrived names the monster.
    for (const request of server.asked.slice(0, before)) {
      expect(request).not.toHaveProperty('monsterPage');
    }
  });

  it('keeps nothing of a thing whose words read as a crisis', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch({ ...arrives, text: 'Thinking about ending my life tonight' });

    expect(app.store.getState().today.kind).toBe('crisis');
    expect(server.asked).toHaveLength(0);
    expect(app.data.dump()).not.toContain(PAGE);
  });
});
