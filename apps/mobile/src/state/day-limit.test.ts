import { describe, expect, it } from '@jest/globals';

import { FREE_STARTS_PER_DAY, MINUTE_MS, PLUS_STARTS_PER_DAY } from '@scootch/domain';

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
}

/** Every start a free phone has, used: one thing after another, twenty minutes apart. */
async function finishTheFreeLimit(app: Phone): Promise<void> {
  for (let index = 0; index < FREE_STARTS_PER_DAY; index += 1) {
    await finishOne(app, `small thing ${index + 1}`, MORNING + index * 20 * MINUTE_MS);
  }
}

const stage = (app: Phone) => stageOf({ ...app.store.getState(), energyAsked: false });
const parkedIds = (app: Phone) => app.store.getState().drawer.items.map((item) => item.id);

describe("the day's limit on starts", () => {
  it('refuses a swap from the drawer once every start has been used, and a start with it', async () => {
    const app = await stagedPhone(stagedServer());
    await finishTheFreeLimit(app);
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 0 });
    const [parked] = parkedIds(app);
    if (!parked) throw new Error('the recorded call parks something');

    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: parked });
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 0 });
    expect(parkedIds(app)).toContain(parked);
    expect(app.data.count('tasks')).toBe(FREE_STARTS_PER_DAY);

    // Nor does a typed thing or a session start get past it.
    await app.say('one more thing', 'typed');
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 0 });
    expect(app.data.count('tasks')).toBe(FREE_STARTS_PER_DAY);
    expect(app.data.count('sessions')).toBe(FREE_STARTS_PER_DAY);
  });

  it('lets a swap through while a start is left, and with Plus past the free limit', async () => {
    const app = await stagedPhone(stagedServer(), undefined, MORNING, { plus: true });
    await finishTheFreeLimit(app);
    expect(app.store.getState().today).toEqual({
      kind: 'done_for_today',
      startsLeft: PLUS_STARTS_PER_DAY - FREE_STARTS_PER_DAY,
    });
    const [parked] = parkedIds(app);
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: parked! });
    expect(app.store.getState().today.kind).toBe('task_set');
  });
});

describe('"pick for me"', () => {
  it('shows the pick on home after a finish, with a way back that changes nothing', async () => {
    const app = await stagedPhone(stagedServer());
    await finishOne(app, 'water the plants', MORNING);
    expect(stage(app)).toMatchObject({ kind: 'home', rested: true, startLeft: true });

    await app.store.dispatch({ type: 'pick_for_me' });
    expect(stage(app).kind).toBe('picked_for_me');

    await app.store.dispatch({ type: 'pick_dropped' });
    expect(stage(app)).toMatchObject({ kind: 'home', rested: true, startLeft: true });
  });

  it('offers no "Pick again" with one thing parked, and never loops on it', async () => {
    const app = await stagedPhone(stagedServer({ online: false }));
    await app.say('sort the receipts', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'task_set_aside' });
    expect(parkedIds(app)).toHaveLength(1);

    await app.store.dispatch({ type: 'pick_for_me' });
    expect(stage(app)).toMatchObject({ kind: 'picked_for_me', canPickAgain: false });
    const before = app.store.getState().pick;
    await app.store.dispatch({ type: 'pick_for_me' });
    expect(app.store.getState().pick).toBe(before);

    await app.store.dispatch({ type: 'pick_dropped' });
    expect(stage(app).kind).toBe('home');
  });
});
