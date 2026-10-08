import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../data/repositories';

import { stagedPhone, stagedServer } from './test/staged-phone';

const bites = [
  { text: 'Find the number.', minutes: 1 },
  { text: 'Write what to ask.', minutes: 3 },
  { text: 'Ring.', minutes: 1 },
];

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

async function taskSet(app: Phone): Promise<void> {
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
}

describe('a guess before starting', () => {
  it('is kept with the task, read back from the database, and replaced by a later one', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    expect(app.task().guessMinutes ?? null).toBeNull();

    await app.store.dispatch({ type: 'guess_made', minutes: 120 });
    expect(app.task().guessMinutes).toBe(120);
    const { tasks } = openRepositories(app.data.db);
    expect((await tasks.get(app.task().id))?.guessMinutes).toBe(120);

    // The phone is opened again on the same database: the guess is still the task's.
    const again = await stagedPhone(stagedServer(), app.data);
    expect(again.task().guessMinutes).toBe(120);

    await again.store.dispatch({ type: 'guess_made', minutes: 30 });
    expect(again.task().guessMinutes).toBe(30);
  });

  it('starts nothing and leaves the set task as it was', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    const before = app.task();
    await app.store.dispatch({ type: 'guess_made', minutes: 360 });
    expect(app.store.getState().today.kind).toBe('task_set');
    expect(app.store.getState().session).toBeNull();
    expect(app.task()).toEqual({ ...before, guessMinutes: 360 });
  });

  it('is not taken with no task set', async () => {
    const app = await stagedPhone(stagedServer());
    await app.store.dispatch({ type: 'guess_made', minutes: 60 });
    const { tasks } = openRepositories(app.data.db);
    expect(await tasks.all()).toEqual([]);
  });
});

describe('the bites, ticked in the app as under a notification', () => {
  it('opens the catch on the last tick: the session begins on the thing', async () => {
    const first = await stagedPhone(stagedServer());
    await taskSet(first);
    const taskId = first.task().id;
    const { lines } = first.task();
    if (lines === null || !('hatch' in lines)) throw new Error('the task has its lines');
    // The recorded pack was written before bites were: this task's pack has its three.
    await openRepositories(first.data.db).tasks.put({
      ...first.task(),
      lines: { ...lines, bites },
    });
    const app = await stagedPhone(stagedServer(), first.data);
    const places = [0, 1, 2];
    for (const place of places.slice(0, 2)) {
      await app.store.dispatch({ type: 'bite_ticked', taskId, place });
    }
    expect(app.task().bitesCaught).toEqual([0, 1]);
    expect(app.store.getState().today.kind).toBe('task_set');

    await app.store.dispatch({ type: 'bite_ticked', taskId, place: 2 });
    const { tasks } = openRepositories(app.data.db);
    expect((await tasks.get(taskId))?.bitesCaught).toEqual([0, 1, 2]);
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
  });
});
