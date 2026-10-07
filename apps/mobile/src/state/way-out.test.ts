import { describe, expect, it } from '@jest/globals';

import { DAY_MS } from '@scootch/domain';

import { stageOf } from '../features/one-screen/one-screen-stage';

import { MORNING, ramble, stagedPhone, stagedServer } from './test/staged-phone';

describe('a task that was started and left', () => {
  it('can be put in the drawer with its monster, and its start stays used', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'session', event: { type: 'left' } });
    await app.store.dispatch({ type: 'session_closed' });
    const task = app.task();
    const { monster } = app.store.getState();
    expect(task.status).toBe('started');

    await app.store.dispatch({ type: 'started_task_parked' });
    expect(app.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 2 });
    expect(app.store.getState().drawer.items.map((item) => item.id)).toContain(task.id);
    expect(app.data.count('monsters')).toBe(1);

    // Swapped back in, it is itself: the same monster, and no second start is taken for it.
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: task.id });
    expect(app.task()).toMatchObject({ id: task.id, text: task.text, status: 'set' });
    expect(app.store.getState().monster).toEqual(monster);
    expect(app.store.getState().today).toMatchObject({ kind: 'task_set', startsLeft: 2 });

    // Left in the drawer overnight, it stays there and is not carried in by itself.
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'session', event: { type: 'left' } });
    await app.store.dispatch({ type: 'session_closed' });
    await app.store.dispatch({ type: 'started_task_parked' });
    const tomorrow = await stagedPhone(stagedServer(), app.data, MORNING + DAY_MS);
    expect(tomorrow.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 3 });
    expect(tomorrow.store.getState().drawer.items.map((item) => item.id)).toContain(task.id);
  });

  it('is not parked while it is only set, or while its session runs', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'started_task_parked' });
    expect(app.store.getState().today.kind).toBe('task_set');
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'started_task_parked' });
    expect(app.store.getState().today.kind).toBe('in_session');
  });
});

describe('"Today\'s one thing", when the words came out wrong', () => {
  it('goes back to the composer with everything that was said, and no start is used', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    expect(app.store.getState().pick.kind).toBe('offered');

    await app.store.dispatch({ type: 'one_thing_returned' });
    const state = app.store.getState();
    expect(state).toMatchObject({
      returnedText: ramble,
      today: { kind: 'nothing_yet', startsLeft: 3 },
      pick: { kind: 'none' },
      heardDeadlines: [],
    });
    expect(stageOf({ ...state, energyAsked: false }).kind).toBe('composer');
    expect(app.data.count('tasks') + app.data.count('monsters')).toBe(0);
    expect(app.data.count('ramble_transcripts')).toBe(0);
  });

  it('does nothing once the thing has been picked', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'one_thing_returned' });
    expect(app.store.getState().today.kind).toBe('task_set');
    expect(app.store.getState().returnedText).toBeNull();
  });
});
