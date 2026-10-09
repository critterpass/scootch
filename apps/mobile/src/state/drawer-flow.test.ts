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

describe('asking Scootch to choose, in words', () => {
  it('offers one parked thing for "pick for me", with no call made and nothing set', async () => {
    const server = stagedServer({ online: false });
    const first = await parked();
    const app = await stagedPhone(server, first.data);
    await app.say('Pick for me, please', 'ramble');

    const state = app.store.getState();
    expect(state.pick.kind).toBe('picked_for_me');
    expect(state.taskCall).toBe('idle');
    expect(state.today.kind).toBe('nothing_yet');
    expect(app.data.count('tasks')).toBe(0);
  });

  it('takes the same words as a task when nothing is parked, and a task that only sounds like it', async () => {
    const empty = await stagedPhone(stagedServer({ online: false }));
    await empty.say('pick for me', 'typed');
    expect(empty.store.getState().pick.kind).toBe('offered');

    const first = await parked();
    const app = await stagedPhone(stagedServer({ online: false }), first.data);
    await app.say('pick up the parcel', 'typed');
    expect(app.store.getState().pick.kind).toBe('offered');
    expect(app.task().originalText).toBe('pick up the parcel');
  });
});

describe('the task waiting for tomorrow, swiped away in the drawer', () => {
  it('is let go with its monster, comes back on no morning, and its start stays used', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    app.time.advanceTo(MORNING + 10 * 60_000);
    await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
    await app.store.dispatch({ type: 'session', event: { type: 'chose_carry_on' } });
    await app.store.dispatch({ type: 'session_closed' });
    const waiting = app.store.getState().waitingForTomorrow;
    if (!waiting) throw new Error('the task waits for tomorrow');

    // Asked for with another id, nothing happens.
    await app.store.dispatch({ type: 'waiting_task_removed', taskId: 'someone-else' });
    expect(app.store.getState().waitingForTomorrow).not.toBeNull();

    await app.store.dispatch({ type: 'waiting_task_removed', taskId: waiting.id });
    expect(app.store.getState().waitingForTomorrow).toBeNull();
    expect(app.data.count('tasks') + app.data.count('monsters')).toBe(0);
    expect(app.store.getState().today).toEqual({
      kind: 'done_for_today',
      startsLeft: FREE_STARTS_PER_DAY - 1,
    });

    const next = await stagedPhone(stagedServer(), app.data, MORNING + DAY_MS);
    expect(next.store.getState().today.kind).toBe('nothing_yet');
  });
});

describe('the task waiting for tomorrow, as a row in the drawer', () => {
  /** A phone whose one thing was started, not finished, and carried on to tomorrow. */
  async function carried(): Promise<Phone> {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    app.time.advanceTo(MORNING + 10 * 60_000);
    await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
    await app.store.dispatch({ type: 'session', event: { type: 'chose_carry_on' } });
    await app.store.dispatch({ type: 'session_closed' });
    return app;
  }

  it('is swapped in for today as it is, with its monster, and no longer waits', async () => {
    const app = await carried();
    const waiting = app.store.getState().waitingForTomorrow;
    if (!waiting) throw new Error('the task waits for tomorrow');
    const monsters = app.data.count('monsters');

    await app.store.dispatch({ type: 'waiting_task_swapped_in', taskId: waiting.id });
    const state = app.store.getState();
    expect(state.today.kind).toBe('task_set');
    expect(app.task()).toMatchObject({ id: waiting.id, carriedOver: false, status: 'set' });
    expect(state.waitingForTomorrow).toBeNull();
    expect(app.data.count('monsters')).toBe(monsters);
  });

  it('is reworded: it still waits, in the new words, unscreened and with no monster', async () => {
    const app = await carried();
    const waiting = app.store.getState().waitingForTomorrow;
    if (!waiting) throw new Error('the task waits for tomorrow');

    await app.store.dispatch({ type: 'waiting_task_edited', taskId: waiting.id, text: '  ' });
    expect(app.store.getState().waitingForTomorrow).toEqual(waiting);

    await app.store.dispatch({
      type: 'waiting_task_edited',
      taskId: waiting.id,
      text: 'ring the  bank about the card',
    });
    expect(app.store.getState().waitingForTomorrow).toMatchObject({
      id: waiting.id,
      text: 'ring the bank about the card',
      screen: 'unscreened',
      lines: null,
    });
    expect(app.data.count('monsters')).toBe(0);
    const next = await stagedPhone(stagedServer({ online: false }), app.data, MORNING + DAY_MS);
    expect(next.task()).toMatchObject({ id: waiting.id, text: 'ring the bank about the card' });
  });

  it('is reworded and leaves behind the line kept for next time', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    app.time.advanceTo(MORNING + 10 * 60_000);
    await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
    await app.store.dispatch({
      type: 'session',
      event: { type: 'chose_carry_on' },
      line: 'find the card number',
    });
    await app.store.dispatch({ type: 'session_closed' });
    const waiting = app.store.getState().waitingForTomorrow;
    if (!waiting) throw new Error('the task waits for tomorrow');
    expect(waiting.nextStart?.text).toBe('find the card number');

    await app.store.dispatch({
      type: 'waiting_task_edited',
      taskId: waiting.id,
      text: 'cancel the old card',
    });
    expect(app.store.getState().waitingForTomorrow?.nextStart ?? null).toBeNull();
    const next = await stagedPhone(stagedServer({ online: false }), app.data, MORNING + DAY_MS);
    expect(next.task()?.nextStart ?? null).toBeNull();
  });
});
