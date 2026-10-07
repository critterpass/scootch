import { describe, expect, it } from '@jest/globals';

import { DAY_MS, MINUTE_MS, returningItem, type SessionEvent } from '@scootch/domain';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;
const THOUGHT = 'email Priya about the invoice';

/** A session under way with one thought parked in it. */
async function working(): Promise<Phone> {
  const app = await stagedPhone(stagedServer());
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await session(app, { type: 'started' });
  app.time.advanceTo(MORNING + MINUTE_MS);
  await session(app, { type: 'thought_parked', text: THOUGHT });
  return app;
}

const session = (app: Phone, event: SessionEvent) => app.store.dispatch({ type: 'session', event });
const inDrawer = (app: Phone) =>
  app.store
    .getState()
    .drawer.items.map((item) => item.text)
    .filter((text) => text === THOUGHT);
const relaunch = (app: Phone, at = MORNING + 5 * MINUTE_MS) =>
  stagedPhone(stagedServer(), app.data, at);

describe('a thought parked during a session', () => {
  it('goes to the drawer when the session is left with the close control', async () => {
    const app = await working();
    await session(app, { type: 'left' });
    await app.store.dispatch({ type: 'session_closed' });
    expect(inDrawer(app)).toEqual([THOUGHT]);
  });

  it('goes to the drawer when the thoughts screen is passed without choosing', async () => {
    const app = await working();
    await session(app, { type: 'double_tapped' });
    expect(app.store.getState().parkedThoughts.map((one) => one.text)).toEqual([THOUGHT]);
    await app.store.dispatch({ type: 'session_closed' });
    expect(inDrawer(app)).toEqual([THOUGHT]);
    expect(inDrawer(await relaunch(app))).toEqual([THOUGHT]);
  });

  it('goes only when the person says so', async () => {
    const app = await working();
    await session(app, { type: 'double_tapped' });
    const [thought] = app.store.getState().parkedThoughts;
    if (!thought) throw new Error('the thought is handed over');
    await app.store.dispatch({ type: 'thought_resolved', thought, resolution: 'discard' });
    await app.store.dispatch({ type: 'session_closed' });
    expect(inDrawer(app)).toEqual([]);
    expect(inDrawer(await relaunch(app))).toEqual([]);
  });

  it('is in the drawer after the app is closed between the finish and the thoughts screen', async () => {
    const app = await working();
    await session(app, { type: 'double_tapped' });
    expect(inDrawer(await relaunch(app))).toEqual([THOUGHT]);
  });

  it('outlives a task that is let go, with or without the app staying open', async () => {
    const app = await working();
    await session(app, { type: 'not_finished' });
    await session(app, { type: 'chose_let_go' });
    expect(app.store.getState().parkedThoughts.map((one) => one.text)).toEqual([THOUGHT]);
    expect(inDrawer(await relaunch(app))).toEqual([THOUGHT]);

    const open = await working();
    await session(open, { type: 'not_finished' });
    await session(open, { type: 'chose_let_go' });
    await open.store.dispatch({ type: 'session_closed' });
    expect(inDrawer(open)).toEqual([THOUGHT]);
  });

  it('is in the drawer the next morning when the session was never ended', async () => {
    const app = await working();
    expect(inDrawer(await relaunch(app, MORNING + DAY_MS))).toEqual([THOUGHT]);
  });

  it('stays out of the drawer while its session is still going', async () => {
    const app = await working();
    const again = await relaunch(app);
    expect(inDrawer(again)).toEqual([]);
    expect(again.store.getState().session).toMatchObject({ thoughts: [{ text: THOUGHT }] });
  });

  it('comes back the next morning when "Tomorrow" is chosen for it', async () => {
    const app = await working();
    await session(app, { type: 'double_tapped' });
    const [thought] = app.store.getState().parkedThoughts;
    if (!thought) throw new Error('the thought is handed over');
    await app.store.dispatch({ type: 'thought_resolved', thought, resolution: 'keep' });
    await app.store.dispatch({ type: 'session_closed' });
    const item = app.store.getState().drawer.items.find((one) => one.text === THOUGHT);
    expect(item).toMatchObject({ dueDate: '2026-10-07', returnOn: '2026-10-07', fadesOn: null });

    const tomorrow = await relaunch(app, MORNING + DAY_MS);
    const { items } = tomorrow.store.getState().drawer;
    expect(returningItem(items, '2026-10-07')?.text).toBe(THOUGHT);
    expect(returningItem(items, '2026-10-06')).toBeNull();
  });
});
