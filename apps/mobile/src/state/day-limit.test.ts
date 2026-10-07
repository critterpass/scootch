import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS } from '@scootch/domain';

import { stageOf } from '../features/one-screen/one-screen-stage';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

/** One thing typed, started and finished, a minute at a time. */
async function finishOne(app: Phone, text: string, at: number): Promise<void> {
  app.time.advanceTo(at);
  await app.say(text, 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await app.store.dispatch({ type: 'session', event: { type: 'started' } });
  await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
  await app.store.dispatch({ type: 'session_closed' });
  await app.store.dispatch({ type: 'one_more_asked' });
}

const stage = (app: Phone) => stageOf({ ...app.store.getState(), energyAsked: false });
const parkedIds = (app: Phone) => app.store.getState().drawer.items.map((item) => item.id);

describe("the day's limit on starts", () => {
  it('refuses a swap from the drawer once three things have been started, and a start with it', async () => {
    const app = await stagedPhone(stagedServer());
    for (const [index, text] of ['water the plants', 'post the letter', 'ring the bank'].entries()) {
      await finishOne(app, text, MORNING + index * 20 * MINUTE_MS);
    }
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 0 });
    const [parked] = parkedIds(app);
    if (!parked) throw new Error('the recorded call parks something');

    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: parked });
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 0 });
    expect(parkedIds(app)).toContain(parked);
    expect(app.data.count('tasks')).toBe(3);

    // Nor does a typed thing or a session start get past it.
    await app.say('one more thing', 'typed');
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 0 });
    expect(app.data.count('tasks')).toBe(3);
    expect(app.data.count('sessions')).toBe(3);
  });

  it('lets a swap through while a start is left, and with Plus after the third', async () => {
    const app = await stagedPhone(stagedServer(), undefined, MORNING, { plus: true });
    for (const [index, text] of ['water the plants', 'post the letter', 'ring the bank'].entries()) {
      await finishOne(app, text, MORNING + index * 20 * MINUTE_MS);
    }
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 3 });
    const [parked] = parkedIds(app);
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: parked! });
    expect(app.store.getState().today.kind).toBe('task_set');
  });
});

describe('"pick for me"', () => {
  it('shows the pick after "One more", where the ask had come back', async () => {
    const app = await stagedPhone(stagedServer());
    await finishOne(app, 'water the plants', MORNING);
    expect(stage(app)).toMatchObject({ kind: 'composer', canPickForMe: true });

    await app.store.dispatch({ type: 'pick_for_me' });
    expect(stage(app).kind).toBe('picked_for_me');

    // And there is a way back to the ask that changes nothing.
    await app.store.dispatch({ type: 'pick_dropped' });
    expect(stage(app)).toMatchObject({ kind: 'composer' });
    expect(app.store.getState().oneMore).toBe(true);
  });

  it('offers no "Pick again" with one thing parked, and never loops on it', async () => {
    const app = await stagedPhone(stagedServer({ online: false }));
    await app.say('sort the receipts', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'carried_task_set_aside' });
    expect(parkedIds(app)).toHaveLength(1);

    await app.store.dispatch({ type: 'pick_for_me' });
    expect(stage(app)).toMatchObject({ kind: 'picked_for_me', canPickAgain: false });
    const before = app.store.getState().pick;
    await app.store.dispatch({ type: 'pick_for_me' });
    expect(app.store.getState().pick).toBe(before);

    await app.store.dispatch({ type: 'pick_dropped' });
    expect(stage(app).kind).toBe('composer');
  });

  it('drops a counter-offer without starting anything', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'excuse_given', text: 'wiped' });
    expect(stage(app).kind).toBe('bargain');

    await app.store.dispatch({ type: 'pick_dropped' });
    expect(stage(app).kind).toBe('task_set');
    expect(app.store.getState().session).toBeNull();
    expect(app.task().status).toBe('set');
  });
});
