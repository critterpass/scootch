import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../../data/repositories';
import { MORNING, stagedPhone, stagedServer } from '../../state/test/staged-phone';

import { PENDING_ACTION_MAX_AGE_MS, createPendingActions } from './pending-actions';
import {
  SHARED_KEYS,
  type MonsterPainter,
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
    expect(pending.take()).toEqual([fresh]);
    shared.values.set(SHARED_KEYS.pendingActions, list);
    expect(pending.take()).toEqual([]);
    shared.values.set(SHARED_KEYS.pendingActions, '{not json');
    expect(pending.take()).toEqual([]);
  });
});

describe('the surface sync on a phone', () => {
  async function phone() {
    const staged = await stagedPhone(stagedServer());
    const shared = fakeShared();
    const { files, written } = fakeFiles();
    const sync = createSurfaceSync({
      store: staged.store,
      repositories: openRepositories(staged.data.db),
      shared: shared.store,
      files,
      painter,
      plus: () => false,
      now: () => staged.time.clock.now(),
      timeZone: () => 'Europe/London',
    });
    return { ...staged, shared, written, sync };
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
    expect([...written.keys()]).toEqual([set['monsterImage']]);
    expect(shared.reloads()).toBeGreaterThan(reloads);
  });
});
