import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import { activityPlanOf } from './activity-plan';
import { planPendingActions, readPendingActions } from './pending-actions';
import type { SurfaceInputs } from './surface-inputs';
import { surfaceSnapshotOf, type SurfaceSnapshotJson } from './surface-snapshot';
import {
  createSurfacesSync,
  SHARED_KEYS,
  type ActivityPort,
  type SharedStore,
} from './surfaces-sync';

const morning = '2026-10-27T09:00:00Z';
const NOTHING: SurfaceInputs = { periodLine: '', enrolled: false, timetable: null, night: null };

/** A board on a real migrated database, with a clock the test moves by hand. */
async function boardAt(start: string) {
  const db = await openMigratedDatabase();
  let at = Date.parse(start);
  let id = 0;
  const store = createBoardStore({
    db,
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
  });
  await store.load();
  return {
    store,
    view: () => store.getSnapshot(),
    wait: (minutes: number) => {
      at += minutes * MINUTE_MS;
      store.tick();
    },
  };
}

/** The App Group and the Live Activity as the device would be told about them. */
function recordingPorts() {
  const values = new Map<string, string>();
  const calls: string[] = [];
  const store: SharedStore = {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
    reloadWidgets: () => void calls.push('reload'),
  };
  const activity: ActivityPort = {
    start: (attributes, state) => {
      calls.push(`start ${state.mode ?? ''} ${attributes.taskTitle}`);
      return Promise.resolve();
    },
    update: (state) => {
      calls.push(`update ${state.mode ?? ''} ${String(state.pressure ?? '')}`);
      return Promise.resolve();
    },
    endAll: () => {
      calls.push('end');
      return Promise.resolve();
    },
  };
  const snapshot = () =>
    JSON.parse(values.get(SHARED_KEYS.snapshot) ?? 'null') as SurfaceSnapshotJson;
  return { store, activity, calls, snapshot };
}

describe('the surfaces snapshot', () => {
  it('carries the desk task, his pressure to come and the fuse while it burns', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('call the bank, then email the landlord and buy milk');
    const first = surfaceSnapshotOf(view(), {
      language: 'en',
      enrolled: false,
      timetable: null,
      night: null,
    });
    expect(first).toMatchObject({
      state: 'task_set',
      task: view().desk?.task.text,
      pressure: 0,
      next: expect.any(Array),
      enrolled: false,
      timetable: null,
      lines: { standBy: 'Go to sleep.' },
    });
    expect(first.pressureAt).toHaveLength(5);
    expect(first.fuseEndsAt).toBe((first.fuseStartsAt ?? 0) + 2 * MINUTE_MS);

    wait(6);
    const later = surfaceSnapshotOf(view(), {
      language: 'vi',
      enrolled: true,
      timetable: null,
      night: null,
    });
    expect(later.pressure).toBe(2);
    expect(later.pressureAt).toHaveLength(3);
    expect(later.fuseEndsAt).toBeNull();
    expect(later.lines.standBy).toBe('Ngủ đi.');
  });

  it('carries no pressure, no fuse and no rises for a serious task', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('get the biopsy results from the hospital');
    wait(30);
    const snapshot = surfaceSnapshotOf(view(), {
      language: 'en',
      enrolled: true,
      timetable: null,
      night: null,
    });
    expect(snapshot).toMatchObject({
      state: 'serious',
      pressure: 0,
      pressureAt: [],
      fuseEndsAt: null,
    });
    expect(activityPlanOf(view(), '')).toBeNull();
  });

  it('shows no task anywhere on a crisis day', async () => {
    const { store, view } = await boardAt(morning);
    await store.say('buy milk');
    await store.say('I want to kill myself');
    const snapshot = surfaceSnapshotOf(view(), {
      language: 'en',
      enrolled: true,
      timetable: null,
      night: null,
    });
    expect(snapshot).toMatchObject({
      state: 'crisis',
      task: null,
      taskId: null,
      next: [],
      more: 0,
      timetable: null,
    });
    expect(activityPlanOf(view(), '')).toBeNull();
  });
});

describe('the Live Activity', () => {
  it('opens on the desk, follows the pressure, turns into the period and ends with it', async () => {
    const { store, view, wait } = await boardAt(morning);
    const ports = recordingPorts();
    const sync = createSurfacesSync(ports);
    const step = async (foreground = true, inputs = NOTHING) => {
      sync.sync(view(), inputs, 'en', foreground);
      await sync.settled();
    };

    await step();
    expect(ports.calls).toEqual(['reload', 'end']);
    ports.calls.length = 0;

    await store.say('call the bank');
    await step();
    expect(ports.calls).toEqual(['reload', 'end', 'start desk Call the bank']);
    expect(ports.snapshot()).toMatchObject({ state: 'task_set', task: 'Call the bank' });
    ports.calls.length = 0;

    // A tick with nothing changed tells the phone nothing.
    wait(0.5);
    await step();
    expect(ports.calls).toEqual([]);

    wait(5);
    await step();
    expect(ports.calls).toContain('update desk 2');

    ports.calls.length = 0;
    await store.start();
    await step(true, { ...NOTHING, periodLine: 'Ten minutes. Go.' });
    expect(ports.calls).toEqual(['reload', 'end', 'start session Call the bank']);
    const plan = activityPlanOf(view(), 'Ten minutes. Go.');
    expect(plan?.state).toMatchObject({ mode: 'session', line: 'Ten minutes. Go.' });

    ports.calls.length = 0;
    await store.finish();
    await step();
    expect(ports.calls).toEqual(['reload', 'end']);
  });

  it('waits for the app to be in front to start one', async () => {
    const { store, view } = await boardAt(morning);
    const ports = recordingPorts();
    const sync = createSurfacesSync(ports);
    await store.say('call the bank');
    sync.sync(view(), NOTHING, 'en', false);
    await sync.settled();
    expect(ports.calls.filter((call) => call.startsWith('start'))).toEqual([]);
    sync.sync(view(), NOTHING, 'en', true);
    await sync.settled();
    expect(ports.calls.filter((call) => call.startsWith('start'))).toEqual([
      'start desk Call the bank',
    ]);
  });
});

describe('what the intents asked for', () => {
  it('puts every word said on the board and acts on the latest press while it is fresh', () => {
    const now = Date.parse(morning);
    const json = JSON.stringify([
      { id: 'a', kind: 'add', text: 'buy milk', at: now - 3 * 60 * MINUTE_MS },
      { id: 'b', kind: 'start', taskId: 't1', at: now - 60 * MINUTE_MS },
      { id: 'c', kind: 'add', text: '  ', at: now },
      { id: 'd', kind: 'done', taskId: 't1', at: now - MINUTE_MS },
      { id: 'e', kind: 'something else', at: now },
      'not an entry',
    ]);
    const plan = planPendingActions(readPendingActions(json), now);
    expect(plan.add).toEqual(['buy milk']);
    expect(plan.press).toMatchObject({ id: 'd', kind: 'done', taskId: 't1' });
    expect(planPendingActions(readPendingActions('{oops'), now)).toEqual({ add: [], press: null });
    // A press from long ago is not acted on; words are never dropped.
    expect(planPendingActions(readPendingActions(json), now + 60 * MINUTE_MS).press).toBeNull();
  });
});
