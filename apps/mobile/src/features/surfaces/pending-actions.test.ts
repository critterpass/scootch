import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../../data/repositories';
import { MORNING, stagedPhone, stagedServer } from '../../state/test/staged-phone';

import { PENDING_ACTION_MAX_AGE_MS, createPendingActions } from './pending-actions';
import {
  SHARED_KEYS,
  type MonsterPainter,
  type WorldPainter,
  type SharedFiles,
  type SharedStore,
} from './surface-ports';
import { createSurfaceSync } from './surface-sync';

function fakeShared() {
  const values = new Map<string, string>();
  let reloads = 0;
  const store: SharedStore = {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
    reloadSurfaces: () => void (reloads += 1),
  };
  return { store, values, reloads: () => reloads };
}

function fakeFiles() {
  const written = new Map<string, Uint8Array>();
  const files: SharedFiles = {
    exists: (name) => written.has(name),
    write: (name, bytes) => {
      written.set(name, bytes);
      return Promise.resolve();
    },
    list: () => [...written.keys()],
    remove: (name) => void written.delete(name),
  };
  return { files, written };
}

const painter: MonsterPainter = { paint: () => Promise.resolve(new Uint8Array([1, 2, 3])) };
const worldPainter: WorldPainter = {
  paint: () => Promise.resolve(new Uint8Array([4, 5])),
  paintScootch: () => Promise.resolve(new Uint8Array([6])),
};

const asked = (...kinds: string[]) =>
  JSON.stringify(kinds.map((kind, index) => ({ id: `a-${index}`, kind, at: MORNING + index })));

describe('pending actions from the system surfaces', () => {
  it('hands each recorded action over once, oldest first, and clears the list', () => {
    const shared = fakeShared();
    const pending = createPendingActions(shared.store, () => MORNING + 1000);
    shared.values.set(
      SHARED_KEYS.pendingActions,
      JSON.stringify([
        { id: 'b', kind: 'stuck', at: MORNING + 5 },
        { id: 'a', kind: 'start_session', at: MORNING },
      ]),
    );
    expect(pending.take().map((action) => action.kind)).toEqual(['start_session', 'stuck']);
    expect(shared.values.has(SHARED_KEYS.pendingActions)).toBe(false);
    expect(pending.take()).toEqual([]);
  });

  it('skips an id it has already handed over, an unknown kind, an old action and broken text', () => {
    const shared = fakeShared();
    const pending = createPendingActions(
      shared.store,
      () => MORNING + PENDING_ACTION_MAX_AGE_MS + 10,
    );
    shared.values.set(SHARED_KEYS.pendingActions, asked('stuck'));
    expect(pending.take()).toEqual([]);

    const fresh = { id: 'f', kind: 'stuck', at: MORNING + PENDING_ACTION_MAX_AGE_MS };
    const list = JSON.stringify([fresh, { id: 'x', kind: 'delete_everything', at: fresh.at }]);
    shared.values.set(SHARED_KEYS.pendingActions, list);
    expect(pending.take()).toEqual([{ ...fresh, taskId: null, biteId: null }]);
    shared.values.set(SHARED_KEYS.pendingActions, list);
    expect(pending.take()).toEqual([]);
    shared.values.set(SHARED_KEYS.pendingActions, '{not json');
    expect(pending.take()).toEqual([]);
  });
});

describe('what was asked about one thing', () => {
  it('keeps the task and the bite an action is about, in the order asked', () => {
    const shared = fakeShared();
    const pending = createPendingActions(shared.store, () => MORNING + 1000);
    const list = [
      { id: 'b', kind: 'bite', taskId: 'task-1', biteId: 'bite-2', at: MORNING + 2 },
      { id: 'a', kind: 'hunt', taskId: 'task-1', at: MORNING + 1 },
      { id: 'c', kind: 'turn_down', taskId: 7, at: MORNING + 3 },
    ];
    shared.values.set(SHARED_KEYS.pendingActions, JSON.stringify(list));
    expect(pending.take()).toEqual([
      { id: 'a', kind: 'hunt', taskId: 'task-1', biteId: null, at: MORNING + 1 },
      { id: 'b', kind: 'bite', taskId: 'task-1', biteId: 'bite-2', at: MORNING + 2 },
      { id: 'c', kind: 'turn_down', taskId: null, biteId: null, at: MORNING + 3 },
    ]);
  });
});

describe('the surface sync on a phone', () => {
  async function phone() {
    const staged = await stagedPhone(stagedServer());
    const shared = fakeShared();
    const { files, written } = fakeFiles();
    const cancelled: string[] = [];
    const sync = createSurfaceSync({
      store: staged.store,
      repositories: openRepositories(staged.data.db),
      shared: shared.store,
      files,
      painter,
      worldPainter,
      cancelNotification: (id) => {
        cancelled.push(id);
        return Promise.resolve();
      },
      plus: () => false,
      accent: () => null,
      finish: () => 'paper',
      now: () => staged.time.clock.now(),
      timeZone: () => 'Europe/London',
    });
    return { ...staged, shared, written, sync, cancelled };
  }

  it('starts the ten-minute session exactly once when the control asked for it', async () => {
    const { store, say, shared, sync, device } = await phone();
    await say();
    await store.dispatch({ type: 'one_thing_picked' });
    await store.dispatch({ type: 'monster_met' });
    expect(store.getState().today.kind).toBe('task_set');

    shared.values.set(SHARED_KEYS.pendingActions, asked('start_session'));
    expect((await sync.opened()).map((action) => action.kind)).toEqual(['start_session']);
    expect(store.getState().session?.phase).toBe('running');
    expect(store.getState().today.kind).toBe('in_session');
    const started = device.calls.live.filter((call) => call.startsWith('start '));
    expect(started).toHaveLength(1);

    // Coming to the front again finds nothing left to do, and a rewritten list is not replayed.
    expect(await sync.opened()).toEqual([]);
    shared.values.set(SHARED_KEYS.pendingActions, asked('start_session'));
    expect(await sync.opened()).toEqual([]);
    expect(device.calls.live.filter((call) => call.startsWith('start '))).toHaveLength(1);
  });

  it('asks for the composer, listening for a brain dump, when there is no task yet', async () => {
    const { store, shared, sync } = await phone();
    shared.values.set(SHARED_KEYS.pendingActions, asked('start_session'));
    await sync.opened();
    expect(store.getState().surfaceRequest).toEqual({ kind: 'composer', listening: false });
    await store.dispatch({ type: 'surface_request_taken' });
    expect(store.getState().surfaceRequest).toBeNull();

    shared.values.set(
      SHARED_KEYS.pendingActions,
      JSON.stringify([{ id: 'dump', kind: 'brain_dump', at: MORNING }]),
    );
    await sync.opened();
    expect(store.getState().surfaceRequest).toEqual({ kind: 'composer', listening: true });
  });

  it('says the picked-up line when Scootch is opened in the middle of a session', async () => {
    const { store, say, sync, task } = await phone();
    await say();
    await store.dispatch({ type: 'one_thing_picked' });
    await store.dispatch({ type: 'monster_met' });
    await store.dispatch({ type: 'session_set', minutes: 10 });
    await store.dispatch({ type: 'session', event: { type: 'started' } });
    await sync.opened();
    const lines = task().lines;
    expect(lines && 'pickedUp' in lines && store.getState().line?.text === lines.pickedUp).toBe(
      true,
    );
  });

  it("takes back a nine o'clock hunt once its thing is no longer waiting", async () => {
    const { store, say, shared, sync, task, cancelled } = await phone();
    await say();
    await store.dispatch({ type: 'one_thing_picked' });
    await store.dispatch({ type: 'monster_met' });
    const set = (taskId: string) =>
      shared.values.set(SHARED_KEYS.morningHunt, JSON.stringify({ taskId, at: MORNING }));

    // Set for the thing that is still today's: it stays.
    set(task().id);
    await sync.sync();
    expect(cancelled).toEqual([]);
    expect(shared.values.has(SHARED_KEYS.morningHunt)).toBe(true);

    // Set for a thing that is gone: the notification is taken back with the note.
    set('gone');
    await store.dispatch({ type: 'session_set', minutes: 10 });
    await store.dispatch({ type: 'session', event: { type: 'started' } });
    await sync.sync();
    expect(cancelled).toEqual(['morning-hunt-gone']);
    expect(shared.values.has(SHARED_KEYS.morningHunt)).toBe(false);
  });

  it('keeps a bite ticked under a notification, and begins the session on the last one', async () => {
    const { store, say, shared, sync, task, data } = await phone();
    await say();
    await store.dispatch({ type: 'one_thing_picked' });
    await store.dispatch({ type: 'monster_met' });
    const bites = [
      { text: 'Find the email.', minutes: 1 },
      { text: 'Write two lines.', minutes: 4 },
      { text: 'Hit send.', minutes: 1 },
    ];
    const lines = task().lines;
    if (lines === null || !('hatch' in lines)) throw new Error('no lines');
    await openRepositories(data.db).tasks.put({ ...task(), lines: { ...lines, bites } });
    const tick = (place: number) => ({
      id: `bite-${place}`,
      kind: 'bite',
      taskId: task().id,
      biteId: `${task().id}:${place}`,
      at: MORNING,
    });

    shared.values.set(SHARED_KEYS.pendingActions, JSON.stringify([tick(0), tick(1)]));
    await sync.opened();
    expect((await openRepositories(data.db).tasks.get(task().id))?.bitesCaught).toEqual([0, 1]);
    expect(store.getState().session?.phase ?? 'set').toBe('set');

    // The last bite: the session begins, and the catch is on its screen.
    shared.values.set(SHARED_KEYS.pendingActions, JSON.stringify([tick(2)]));
    await sync.opened();
    expect((await openRepositories(data.db).tasks.get(task().id))?.bitesCaught).toEqual([0, 1, 2]);
    expect(store.getState().today.kind).toBe('in_session');
  });

  it('rests today when tomorrow at nine is asked for, and turns one monster down for a week', async () => {
    const { store, say, sync, task, data, shared } = await phone();
    await say();
    await store.dispatch({ type: 'one_thing_picked' });
    await store.dispatch({ type: 'monster_met' });
    const id = task().id;

    await sync.aboutOneThing('turn_down', id, null);
    const turned = await openRepositories(data.db).tasks.get(id);
    expect(turned?.softUntil).toBe('2026-10-12');
    // A thing that is not there is left alone.
    await sync.aboutOneThing('turn_down', 'gone', null);

    await sync.aboutOneThing('tomorrow', 'not-todays', null);
    expect(store.getState().today.kind).toBe('task_set');
    await sync.aboutOneThing('tomorrow', id, null);
    expect(store.getState().today.kind).toBe('done_for_today');
    expect(store.getState().waitingForTomorrow?.id).toBe(id);
    await sync.sync();
    const snapshot = JSON.parse(shared.values.get(SHARED_KEYS.snapshot) ?? '{}') as {
      tomorrow?: unknown;
    };
    expect(snapshot.tomorrow).toMatchObject({ taskId: id });
  });

  it('writes the snapshot and the monster picture when today changes, and only then', async () => {
    const { store, say, shared, written, sync, task } = await phone();
    await sync.sync();
    expect(JSON.parse(shared.values.get(SHARED_KEYS.snapshot) ?? '{}')).toMatchObject({
      state: 'nothing_yet',
      task: null,
    });
    const reloads = shared.reloads();
    await sync.sync();
    expect(shared.reloads()).toBe(reloads);

    await say();
    await store.dispatch({ type: 'one_thing_picked' });
    await store.dispatch({ type: 'monster_met' });
    await sync.sync();
    const set = JSON.parse(shared.values.get(SHARED_KEYS.snapshot) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(set['state']).toBe('task_set');
    expect(set['task']).toBe(task().text);
    // The monster's picture, the world by day and asleep, and Scootch alone.
    expect([...written.keys()].sort()).toEqual(
      [set['monsterImage'], set['worldImage'], set['worldNightImage'], set['scootchImage']].sort(),
    );
    expect(set['worldImage']).toMatch(/^surface-world-[0-9a-f]{8}\.png$/);
    expect(shared.reloads()).toBeGreaterThan(reloads);
  });
});
