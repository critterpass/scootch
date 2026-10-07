import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, beginHunt, moreHunt, pauseHunt, type HuntRecord } from '@scootch/domain';

import { openRepositories } from '../data/repositories';
import { readHunt } from '../features/surfaces/hunt-store';

import { stagedPhone, stagedServer } from './test/staged-phone';

/** A phone with today's one thing set and its monster met, ready to start. */
async function withTaskSet() {
  const phone = await stagedPhone(stagedServer());
  await phone.say();
  await phone.store.dispatch({ type: 'one_thing_picked' });
  await phone.store.dispatch({ type: 'monster_met' });
  return {
    ...phone,
    task: phone.task(),
    now: () => phone.time.clock.now(),
    repositories: openRepositories(phone.data.db),
  };
}

describe('reading the hunt record', () => {
  it('reads what Swift writes, where a nil field is simply not there', () => {
    const swift = '{"taskId":"t","startedAt":1,"beginsAt":3001,"endsAt":603001,"pausedAt":4000}';
    expect(readHunt(swift)).toEqual({
      taskId: 't',
      startedAt: 1,
      beginsAt: 3001,
      endsAt: 603001,
      pausedAt: 4000,
      parkedAt: null,
      parkedText: null,
      caughtAt: null,
      stoppedAt: null,
    });
  });

  it.each([
    ['nothing', null],
    ['broken text', '{not json'],
    ['a list', '[]'],
    ['no task', '{"startedAt":1,"beginsAt":2,"endsAt":3}'],
    ['an end before its beginning', '{"taskId":"t","startedAt":1,"beginsAt":9,"endsAt":3}'],
    ['times that are not numbers', '{"taskId":"t","startedAt":"1","beginsAt":2,"endsAt":3}'],
  ])('reads %s as no record', (_, stored) => {
    expect(readHunt(stored)).toBeNull();
  });
});

describe('a hunt begun outside the app', () => {
  it('becomes the running session, started when its clock started', async () => {
    const { store, task, now, repositories, time } = await withTaskSet();
    const hunt = beginHunt(task.id, 10, now());
    time.jumpTo(now() + 4 * MINUTE_MS);

    await store.dispatch({ type: 'hunt_adopted', hunt });

    const state = store.getState();
    expect(state.today.kind).toBe('in_session');
    expect(state.session).toMatchObject({ phase: 'running', endsAt: hunt.endsAt });
    const rows = await repositories.sessions.where('taskId', task.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ plannedMinutes: 10, endedAt: null, treat: null });
    expect(Date.parse(rows[0]?.startedAt ?? '')).toBe(hunt.beginsAt);
    expect((await repositories.tasks.get(task.id))?.status).toBe('started');
  });

  it('is taken up once: adopting it again starts nothing more', async () => {
    const { store, task, now, repositories, time } = await withTaskSet();
    const hunt = beginHunt(task.id, 10, now());
    time.jumpTo(now() + MINUTE_MS);

    await store.dispatch({ type: 'hunt_adopted', hunt });
    await store.dispatch({ type: 'hunt_adopted', hunt });

    expect(await repositories.sessions.where('taskId', task.id)).toHaveLength(1);
    expect(store.getState().session).toMatchObject({ phase: 'running', endsAt: hunt.endsAt });
  });

  it('opens on "time" when its time ran out while the app was away', async () => {
    const { store, task, now, time } = await withTaskSet();
    const hunt = beginHunt(task.id, 10, now());
    time.jumpTo(now() + 40 * MINUTE_MS);

    await store.dispatch({ type: 'hunt_adopted', hunt });

    expect(store.getState().session?.phase).toBe('time_up');
  });

  it('waits out the count-in, where "Not yet" can still take it back', async () => {
    const { store, task, now } = await withTaskSet();

    await store.dispatch({ type: 'hunt_adopted', hunt: beginHunt(task.id, 10, now()) });

    expect(store.getState().today.kind).toBe('task_set');
  });

  it('gives a clock held on the Lock Screen its minutes back from now', async () => {
    const { store, task, now, time } = await withTaskSet();
    const begun = beginHunt(task.id, 10, now());
    time.jumpTo(now() + 2 * MINUTE_MS);
    const held = pauseHunt(begun, now());
    time.jumpTo(now() + 30 * MINUTE_MS);

    await store.dispatch({ type: 'hunt_adopted', hunt: held });

    expect(store.getState().session).toMatchObject({
      phase: 'running',
      endsAt: begun.endsAt + 30 * MINUTE_MS,
    });
  });

  it.each<[string, (hunt: HuntRecord) => HuntRecord]>([
    ['another task', (hunt) => ({ ...hunt, taskId: 'someone-else' })],
    ['one already caught', (hunt) => ({ ...hunt, caughtAt: hunt.beginsAt + 1 })],
    ['one stopped early', (hunt) => ({ ...hunt, stoppedAt: hunt.beginsAt + 1 })],
  ])('starts nothing for %s', async (_, change) => {
    const { store, task, now, time } = await withTaskSet();
    const hunt = change(beginHunt(task.id, 10, now()));
    time.jumpTo(now() + MINUTE_MS);

    await store.dispatch({ type: 'hunt_adopted', hunt });

    expect(store.getState().today.kind).toBe('task_set');
  });
});

describe('a session running here, moved on the Lock Screen', () => {
  it('follows "5 more"', async () => {
    const { store, task, now, time } = await withTaskSet();
    await store.dispatch({ type: 'surface_action', action: 'start_session' });
    const session = store.getState().session;
    if (session?.phase !== 'running' || session.endsAt === null) throw new Error('not running');
    const hunt: HuntRecord = {
      ...beginHunt(task.id, 10, now()),
      beginsAt: now(),
      endsAt: session.endsAt,
    };
    time.jumpTo(now() + 9 * MINUTE_MS);
    // Asked for with a minute left is not overtime, so nothing moves.
    expect(moreHunt(hunt, now())).toBe(hunt);

    const later = session.endsAt + 4 * MINUTE_MS;
    await store.dispatch({ type: 'hunt_adopted', hunt: { ...hunt, endsAt: later } });

    expect(store.getState().session).toMatchObject({ phase: 'running', endsAt: later });
  });
});
