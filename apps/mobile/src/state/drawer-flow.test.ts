import { describe, expect, it } from '@jest/globals';

import { DAY_MS, FADE_AFTER_DAYS, FREE_STARTS_PER_DAY, addDays } from '@scootch/domain';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;
const items = (app: Phone) => app.store.getState().drawer.items;

/** A phone with the recorded ramble's things parked and nothing set. */
async function parked(): Promise<Phone> {
  const app = await stagedPhone(stagedServer());
  await app.say();
  await app.store.dispatch({ type: 'task_set_aside' });
  expect(items(app).length).toBeGreaterThan(2);
  return app;
}

describe('taking a parked thing out of the drawer', () => {
  it('removes it with no trace, earns nothing and uses no start', async () => {
    const app = await parked();
    const [first] = items(app);
    const before = items(app).length;
    await app.store.dispatch({ type: 'drawer_item_removed', itemId: first!.id });

    expect(items(app)).toHaveLength(before - 1);
    expect(items(app).map((item) => item.id)).not.toContain(first!.id);
    expect(app.store.getState().today).toEqual({
      kind: 'nothing_yet',
      startsLeft: FREE_STARTS_PER_DAY,
    });
    expect(app.data.count('world_pieces') + app.data.count('monsters')).toBe(0);
    // Asked for twice, the second changes nothing.
    await app.store.dispatch({ type: 'drawer_item_removed', itemId: first!.id });
    expect(items(app)).toHaveLength(before - 1);
  });

  it('takes a task that was parked whole, and its monster, with it', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'session', event: { type: 'left' } });
    await app.store.dispatch({ type: 'session_closed' });
    const taskId = app.task().id;
    await app.store.dispatch({ type: 'started_task_parked' });
    expect(app.data.count('tasks')).toBe(1);
    const item = items(app).find((one) => one.id === taskId);
    if (!item) throw new Error('the started task is parked');

    await app.store.dispatch({ type: 'drawer_item_removed', itemId: item.id });
    expect(app.data.count('tasks') + app.data.count('monsters')).toBe(0);
  });

  it('drops a pick that was showing the thing', async () => {
    const app = await parked();
    await app.store.dispatch({ type: 'pick_for_me' });
    const { pick } = app.store.getState();
    if (pick.kind !== 'picked_for_me') throw new Error('something is picked');
    await app.store.dispatch({ type: 'drawer_item_removed', itemId: pick.itemId });
    expect(app.store.getState().pick).toEqual({ kind: 'none' });
  });
});

describe('rewording a parked thing', () => {
  it('keeps the new words, as words nobody has screened, and moves its fade on', async () => {
    const first = await parked();
    const undated = items(first).find((item) => item.dueDate === null);
    if (!undated) throw new Error('something undated is parked');

    const app = await stagedPhone(stagedServer(), first.data, MORNING + 3 * DAY_MS);
    await app.store.dispatch({
      type: 'drawer_item_edited',
      itemId: undated.id,
      text: '  book   the dentist ',
    });
    const edited = items(app).find((item) => item.id === undated.id);
    const today = app.store.getState().localDate;
    expect(edited).toMatchObject({
      text: 'book the dentist',
      screen: 'unscreened',
      firstMentionedOn: undated.firstMentionedOn,
      lastMentionedOn: today,
      fadesOn: addDays(today, FADE_AFTER_DAYS),
    });
  });

  it('leaves a dated thing its day, and changes nothing for empty or unchanged words', async () => {
    const app = await parked();
    const dated = items(app).find((item) => item.dueDate !== null);
    if (!dated) throw new Error('the recorded call heard a date');
    await app.store.dispatch({ type: 'drawer_item_edited', itemId: dated.id, text: '   ' });
    await app.store.dispatch({ type: 'drawer_item_edited', itemId: dated.id, text: dated.text });
    expect(items(app).find((item) => item.id === dated.id)).toEqual(dated);

    await app.store.dispatch({ type: 'drawer_item_edited', itemId: dated.id, text: 'pay it' });
    expect(items(app).find((item) => item.id === dated.id)).toMatchObject({
      text: 'pay it',
      dueDate: dated.dueDate,
      returnOn: dated.returnOn,
      fadesOn: null,
    });
  });

  it('becomes the one thing when reworded into something already parked', async () => {
    const app = await parked();
    const [one, other] = items(app);
    const before = items(app).length;
    await app.store.dispatch({
      type: 'drawer_item_edited',
      itemId: one!.id,
      text: other!.text.toUpperCase(),
    });
    expect(items(app)).toHaveLength(before - 1);
    expect(items(app).map((item) => item.id)).toContain(other!.id);
  });

  it('is a crisis at once when the new words say so, exactly as a ramble is', async () => {
    const app = await parked();
    const [one] = items(app);
    await app.store.dispatch({
      type: 'drawer_item_edited',
      itemId: one!.id,
      text: 'I want to kill myself',
    });
    expect(app.store.getState().today.kind).toBe('crisis');
  });
});
