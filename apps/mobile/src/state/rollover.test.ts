import { describe, expect, it } from '@jest/globals';

import { DAY_MS, HOUR_MS, MINUTE_MS } from '@scootch/domain';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

/** A day on which one thing was set and left: typed, hatched, started and walked away from. */
async function dayWithATaskLeft() {
  const server = stagedServer();
  const app = await stagedPhone(server);
  await app.say();
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  const task = app.task();
  const monster = app.store.getState().monster;
  if (!monster) throw new Error('the task has no monster');
  return { server, app, task, monster };
}

const everything = (app: Awaited<ReturnType<typeof stagedPhone>>) => {
  const { today, drawer } = app.store.getState();
  return {
    today: 'task' in today ? today.task.id : null,
    drawer: drawer.items.map((item) => item.id),
  };
};

describe('a task left unfinished when the day turns', () => {
  it('is back as the carried task the next morning, with its monster', async () => {
    const { server, app, task, monster } = await dayWithATaskLeft();
    const next = await stagedPhone(server, app.data, MORNING + DAY_MS);

    const state = next.store.getState();
    expect(next.task()).toMatchObject({ id: task.id, carriedOver: true, status: 'set' });
    expect(state.morning).toMatchObject({ kind: 'carried_over', taskId: task.id });
    expect(state.monster).toMatchObject({ id: monster.id, name: monster.name });
  });

  it.each([1, 2, 7, 40])('is in today or in the drawer %i days on, never in neither', async (gap) => {
    const { server, app, task } = await dayWithATaskLeft();
    const next = await stagedPhone(server, app.data, MORNING + gap * DAY_MS);

    const { today, drawer } = everything(next);
    expect([today, ...drawer]).toContain(task.id);
    expect(next.data.count('monsters')).toBe(1);
    expect(next.data.count('tasks')).toBe(1);
  });

  it('goes to the drawer with its monster after its one carried morning, and comes back whole', async () => {
    const { server, app, task, monster } = await dayWithATaskLeft();
    await stagedPhone(server, app.data, MORNING + DAY_MS);
    const third = await stagedPhone(server, app.data, MORNING + 2 * DAY_MS);

    expect(third.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 3 });
    expect(everything(third).drawer).toContain(task.id);
    expect(third.data.count('monsters')).toBe(1);

    await third.store.dispatch({ type: 'drawer_item_swapped_in', itemId: task.id });
    expect(third.task()).toMatchObject({ id: task.id, lines: task.lines, carriedOver: false });
    expect(third.store.getState().monster).toMatchObject({ id: monster.id });
    expect(everything(third).drawer).not.toContain(task.id);
    expect(third.data.count('tasks')).toBe(1);
  });

  it.each([7, 40])(
    'waits in the drawer after %i days away, and the morning asks for the smallest thing',
    async (gap) => {
      const { server, app, task } = await dayWithATaskLeft();
      const back = await stagedPhone(server, app.data, MORNING + gap * DAY_MS);

      expect(back.store.getState().today).toEqual({ kind: 'nothing_yet', startsLeft: 3 });
      expect(back.store.getState().morning.kind).toBe('smallest_ask');
      expect(everything(back).drawer).toContain(task.id);
      expect(back.data.count('monsters')).toBe(1);
    },
  );

  it('still belongs to its own day before four in the morning, and is carried after', async () => {
    const { server, app, task } = await dayWithATaskLeft();
    // 03:30 in London on the 7th is still the 6th; 04:30 is the 7th.
    const late = await stagedPhone(server, app.data, MORNING + 17.5 * HOUR_MS);
    expect(late.store.getState().localDate).toBe('2026-10-06');
    expect(late.task()).toMatchObject({ id: task.id, carriedOver: false });

    const early = await stagedPhone(server, app.data, MORNING + 18.5 * HOUR_MS);
    expect(early.store.getState().localDate).toBe('2026-10-07');
    expect(early.task()).toMatchObject({ id: task.id, carriedOver: true });
  });

  it('is kept across a flight: west keeps the day under way, east carries it', async () => {
    const { server, app, task } = await dayWithATaskLeft();
    // The same evening in Honolulu, where the clock still says the 6th.
    const west = await stagedPhone(server, app.data, MORNING + 10 * HOUR_MS, {
      timeZone: 'Pacific/Honolulu',
    });
    expect(west.task()).toMatchObject({ id: task.id, carriedOver: false });
    // The same evening in Auckland, where the 7th has started.
    const east = await stagedPhone(server, app.data, MORNING + 10 * HOUR_MS, {
      timeZone: 'Pacific/Auckland',
    });
    expect(east.store.getState().localDate).toBe('2026-10-07');
    expect(east.task()).toMatchObject({ id: task.id, carriedOver: true });
    // Back in London the next morning the 7th is not opened twice, and nothing has gone anywhere.
    const home = await stagedPhone(server, app.data, MORNING + DAY_MS);
    expect(home.task()).toMatchObject({ id: task.id, carriedOver: true });
  });

  it('ends a session that was left running, and gives the new day all its starts', async () => {
    const { server, app, task } = await dayWithATaskLeft();
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });

    const next = await stagedPhone(server, app.data, MORNING + DAY_MS);
    await next.store.dispatch({ type: 'session', event: { type: 'clock' } });
    expect(next.store.getState().today).toMatchObject({ kind: 'task_set', startsLeft: 3 });
    expect(next.task()).toMatchObject({ id: task.id, status: 'set', carriedOver: true });
    expect(next.store.getState().session).toBeNull();
    expect(next.data.dump()).toContain('left_early');
  });
});

describe('"Carry on tomorrow"', () => {
  async function carriedOn() {
    const { server, app, task } = await dayWithATaskLeft();
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    app.time.advanceTo(MORNING + 10 * MINUTE_MS);
    await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
    await app.store.dispatch({ type: 'session', event: { type: 'chose_carry_on' } });
    await app.store.dispatch({ type: 'session_closed' });
    return { server, app, task };
  }

  it('rests the day with the task waiting for tomorrow, and counts the start it used', async () => {
    const { server, app, task } = await carriedOn();
    const rested = app.store.getState();
    expect(rested.today).toEqual({ kind: 'done_for_today', startsLeft: 2 });
    expect(rested.waitingForTomorrow).toMatchObject({ id: task.id });

    // Killed and opened again the same day: still resting, still one start used.
    const again = await stagedPhone(server, app.data, MORNING + HOUR_MS);
    expect(again.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 2 });
    expect(again.store.getState().waitingForTomorrow).toMatchObject({ id: task.id });
  });

  it('brings the task back the next morning, and on a later one when that morning is skipped', async () => {
    const { server, app, task } = await carriedOn();
    const skipped = await stagedPhone(server, app.data, MORNING + 3 * DAY_MS);
    expect(skipped.task()).toMatchObject({ id: task.id, carriedOver: true, status: 'set' });
    expect(skipped.store.getState().waitingForTomorrow).toBeNull();
  });
});

describe('ending the day without finishing', () => {
  it('carries a set task to tomorrow and rests the day', async () => {
    const { server, app, task } = await dayWithATaskLeft();
    await app.store.dispatch({ type: 'done_for_today' });
    expect(app.store.getState().today).toEqual({ kind: 'done_for_today', startsLeft: 3 });
    expect(app.store.getState().waitingForTomorrow).toMatchObject({ id: task.id });

    const next = await stagedPhone(server, app.data, MORNING + DAY_MS);
    expect(next.task()).toMatchObject({ id: task.id, carriedOver: true });
  });
});
