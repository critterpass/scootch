import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, type TaskCreateStartResponse } from '@scootch/domain';

import seriousFixture from '../../../../packages/voice/fixtures/task.create.serious.en.json';
import type { TaskLinesAnswer } from '../api/scootch-api';
import { openRepositories } from '../data/repositories';

import { MORNING, recordedLines, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

async function startAndFinish(app: Phone): Promise<void> {
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await app.store.dispatch({ type: 'session', event: { type: 'started' } });
  app.time.advanceTo(MORNING + 7 * MINUTE_MS);
  await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
  await app.store.dispatch({ type: 'session_closed' });
}

async function kept(app: Phone) {
  const { monsters, worldPieces, tasks } = openRepositories(app.data.db);
  return {
    monsters: await monsters.all(),
    pieces: await worldPieces.all(),
    tasks: await tasks.all(),
  };
}

/** A thing typed, started and finished with no connection: a plain piece and no monster. */
async function finishedOffline() {
  const server = stagedServer({ online: false });
  const app = await stagedPhone(server);
  await app.say('ring the bank', 'typed');
  await startAndFinish(app);
  const before = await kept(app);
  expect(before.monsters).toEqual([]);
  expect(before.pieces).toMatchObject([{ kind: 'plain', monsterId: null }]);
  return { server, app, piece: before.pieces[0] };
}

describe('a task finished before the server answered for it', () => {
  it('gets its monster, its card and its place in the world when the answer comes', async () => {
    const { server, app, piece } = await finishedOffline();
    server.online = true;
    await app.store.dispatch({ type: 'connection_returned' });

    const after = await kept(app);
    expect(after.tasks).toMatchObject([{ status: 'finished', screen: 'pass' }]);
    expect(after.monsters).toMatchObject([
      { taskId: after.tasks[0]?.id, number: 1, caughtOn: '2026-10-06', catchMinutes: 7 },
    ]);
    // The piece that was put down at the finish is the same piece, now the monster's.
    expect(after.pieces).toEqual([{ ...piece, kind: 'monster', monsterId: after.monsters[0]?.id }]);
    // Nothing is replayed: no session, no hatch line, and the day is as it was.
    expect(app.store.getState()).toMatchObject({
      session: null,
      line: null,
      burst: null,
      today: { kind: 'done_for_today' },
    });
  });

  it('gets them when the app is next opened with a connection', async () => {
    const { app } = await finishedOffline();
    const again = await stagedPhone(stagedServer(), app.data, MORNING + 60 * MINUTE_MS);
    const after = await kept(again);
    expect(after.monsters).toMatchObject([{ number: 1 }]);
    expect(after.pieces).toMatchObject([{ kind: 'monster', monsterId: after.monsters[0]?.id }]);
    // It is asked about once, not on every return to the app.
    await again.store.dispatch({ type: 'app_foregrounded' });
    expect((await kept(again)).monsters).toHaveLength(1);
  });

  it('gets them when its name and lines arrive after the finish', async () => {
    let answer: (lines: TaskLinesAnswer) => void = () => undefined;
    const server = stagedServer({ lines: () => new Promise((resolve) => (answer = resolve)) });
    const app = await stagedPhone(server);
    const said = app.say('ring the bank', 'typed');
    await app.until(() => app.store.getState().pick.kind === 'offered');
    await startAndFinish(app);
    expect((await kept(app)).pieces).toMatchObject([{ kind: 'plain' }]);

    answer(recordedLines);
    await said;
    const after = await kept(app);
    expect(after.monsters).toMatchObject([{ number: 1, catchMinutes: 7 }]);
    expect(after.pieces).toMatchObject([{ kind: 'monster', monsterId: after.monsters[0]?.id }]);
    expect(app.store.getState().line?.slot).not.toBe('hatch');
  });

  it('stays a plain piece with no monster when the answer calls it serious', async () => {
    const { server, app, piece } = await finishedOffline();
    server.online = true;
    server.start = seriousFixture.response as TaskCreateStartResponse;
    await app.store.dispatch({ type: 'connection_returned' });

    const after = await kept(app);
    expect(after.tasks).toMatchObject([{ status: 'finished', screen: 'serious' }]);
    expect(after.monsters).toEqual([]);
    expect(after.pieces).toEqual([piece]);
  });
});
