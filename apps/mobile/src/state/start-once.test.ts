import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, type SessionRow } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import type { DayEvent } from './day-types';
import { opensOnSession } from './session-relaunch';
import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

async function taskSet(app: Phone): Promise<void> {
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
}

const SET: DayEvent = { type: 'session_set', minutes: 10 };
const STARTED: DayEvent = { type: 'session', event: { type: 'started' } };
const openRows = (rows: readonly SessionRow[]) => rows.filter((row) => row.endedAt === null);

describe('starting a session', () => {
  // Every way two taps on Start can interleave their two events, and a third tap for good measure.
  const taps: DayEvent[][] = [
    [SET, STARTED, SET, STARTED],
    [SET, SET, STARTED, STARTED],
    [SET, STARTED, STARTED, SET],
    [SET, STARTED, SET, STARTED, SET, STARTED],
  ];
  it.each(taps)('happens once however often Start is tapped (%#)', async (...events) => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    // The taps land a few seconds apart.
    for (const [index, event] of events.entries()) {
      app.time.advanceTo(MORNING + index * 3000);
      await app.store.dispatch(event);
    }

    const { sessions } = openRepositories(app.data.db);
    const rows = await sessions.all();
    expect(rows).toHaveLength(1);
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
    // The timer is the first start's: a later tap does not move it.
    const firstStart = MORNING + events.indexOf(STARTED) * 3000;
    expect(rows[0]?.startedAt).toBe(new Date(firstStart).toISOString());
    expect(app.store.getState().session).toMatchObject({ endsAt: firstStart + 10 * MINUTE_MS });
    expect(app.device.calls.cues.filter((cue) => cue === 'start-burst')).toHaveLength(1);

    // Leaving it ends it for good: the one screen is back and nothing sends the person in again.
    await app.store.dispatch({ type: 'session', event: { type: 'left' } });
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().today.kind).toBe('task_set');
    expect(openRows(await sessions.all())).toEqual([]);
  });

  it('closes the older of two open sessions for one task when the app starts', async () => {
    const first = await stagedPhone(stagedServer());
    await taskSet(first);
    await first.store.dispatch(SET);
    await first.store.dispatch(STARTED);
    const { sessions } = openRepositories(first.data.db);
    const [row] = await sessions.all();
    if (!row) throw new Error('a session was started');
    // What an earlier version of the app left behind: a second open row, started a minute later.
    const later = new Date(MORNING + MINUTE_MS).toISOString();
    const second: SessionRow = {
      ...row,
      id: 'second-open-row',
      startedAt: later,
      endsAt: new Date(MORNING + 11 * MINUTE_MS).toISOString(),
    };
    await sessions.put(second);

    const app = await stagedPhone(stagedServer(), first.data, MORNING + 2 * MINUTE_MS);
    const rows = await sessions.all();
    expect(openRows(rows)).toEqual([second]);
    expect(rows.find((one) => one.id === row.id)).toEqual({
      ...row,
      endedAt: later,
      outcome: 'left_early',
    });
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });

    await app.store.dispatch({ type: 'session', event: { type: 'left' } });
    await app.store.dispatch({ type: 'session_closed' });
    expect(openRows(await sessions.all())).toEqual([]);
    expect(app.store.getState().today.kind).toBe('task_set');
  });

  it('closes a session left open on a task that has since been finished', async () => {
    const first = await stagedPhone(stagedServer());
    await taskSet(first);
    await first.store.dispatch(SET);
    await first.store.dispatch(STARTED);
    const { sessions } = openRepositories(first.data.db);
    const [row] = await sessions.all();
    if (!row) throw new Error('a session was started');
    first.time.advanceTo(MORNING + 5 * MINUTE_MS);
    await first.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    const finishedAt = new Date(MORNING + 5 * MINUTE_MS).toISOString();
    const orphan: SessionRow = { ...row, id: 'orphan-row', endedAt: null, outcome: null };
    await sessions.put({ ...orphan, finishMethod: null });

    const app = await stagedPhone(stagedServer(), first.data, MORNING + 30 * MINUTE_MS);
    expect(opensOnSession(app.store.getState())).toBe(false);
    expect(app.store.getState().today.kind).toBe('done_for_today');
    expect(await sessions.get('orphan-row')).toMatchObject({
      endedAt: finishedAt,
      outcome: 'left_early',
    });
  });
});

describe('a session event whose write fails', () => {
  it('leaves the session on the screen as it is stored, not as if it had been written', async () => {
    const reported: unknown[] = [];
    const app = await stagedPhone(stagedServer(), undefined, MORNING, {
      onFailure: (error) => reported.push(error),
    });
    await taskSet(app);
    await app.store.dispatch(SET);
    await app.store.dispatch(STARTED);
    // The storage under the app breaks: the finish cannot be written.
    await app.data.db.runAsync('ALTER TABLE sessions RENAME TO sessions_gone', []);
    const finish = app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    await expect(finish).rejects.toBeDefined();
    expect(reported).toHaveLength(1);
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
  });
});
