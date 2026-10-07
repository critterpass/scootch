import {
  DAY_ROLLOVER_HOUR,
  addDays,
  instantFromIso,
  instantOfLocal,
  isoWeekOf,
  type CardFinish,
} from '@scootch/domain';

import type { Repositories } from '../../data/repositories';
import type { DayStore } from '../../state/day-store';
import type { DayState } from '../../state/day-types';
import { readHunt } from './hunt-store';

import { finishedThings } from '../world/landmarks';

import { shareMonsterImages } from './monster-image';
import { createPendingActions } from './pending-actions';
import {
  SHARED_KEYS,
  type MonsterPainter,
  type SharedFiles,
  type SharedStore,
} from './surface-ports';
import { buildSurfaceSnapshot, type WaitingThing } from './surface-snapshot';

export interface SurfaceSyncDeps {
  readonly store: DayStore;
  readonly repositories: Pick<Repositories, 'recordBars' | 'worldPieces' | 'tasks' | 'monsters'>;
  readonly shared: SharedStore;
  readonly files: SharedFiles;
  readonly painter: MonsterPainter;
  readonly plus: () => boolean;
  /** The worn ink's accent as a hex colour; `null` for tomato. */
  readonly accent: () => string | null;
  /** The finish the person wears. */
  readonly finish: () => CardFinish;
  readonly now: () => number;
  readonly timeZone: () => string;
}

const TIMED: readonly string[] = ['running', 'stuck', 'holding'];
/** The actions today's store acts on. The others are about a hunt begun outside the app. */
const DAY_ACTIONS = ['start_session', 'brain_dump', 'park_thought', 'stuck'] as const;
type DayAction = (typeof DAY_ACTIONS)[number];
const isDayAction = (kind: string): kind is DayAction =>
  (DAY_ACTIONS as readonly string[]).includes(kind);

/** The parts of the day a surface shows. While none of them changes, nothing is written. */
function shownParts(
  state: DayState,
  plus: boolean,
  accent: string | null,
  finish: CardFinish,
): readonly unknown[] {
  const { settings } = state;
  return [
    state.today,
    state.monster,
    state.line,
    settings.attitude,
    settings.language,
    plus,
    accent,
    finish,
    state.localDate,
  ];
}

/**
 * Keeps the system surfaces in step with the day store: writes the shared snapshot (and the
 * monster's picture) whenever what a surface shows has changed, asks the system to draw the
 * widgets again, and hands the store what the controls and buttons asked for while the app was
 * away.
 */
export function createSurfaceSync(deps: SurfaceSyncDeps) {
  const { store, shared } = deps;
  const pending = createPendingActions(shared, deps.now);
  let queue: Promise<void> = Promise.resolve();
  let lastParts: readonly unknown[] | null = null;
  let lastJson: string | null = null;

  async function write(): Promise<void> {
    const state = store.getState();
    if (!state.ready) return;
    const plus = deps.plus();
    const accent = deps.accent();
    const finish = deps.finish();
    const parts = shownParts(state, plus, accent, finish);
    if (lastParts && parts.every((part, index) => part === lastParts?.[index])) return;
    lastParts = parts;

    const { today } = state;
    // A serious task and a crisis day have no monster on any surface, so none is kept there.
    const monster = today.kind === 'serious' || today.kind === 'crisis' ? null : state.monster;
    // Today's unfinished things with a monster may lurk; the snapshot decides which are shown.
    // One carried to tomorrow lurks from tomorrow, when a hunt on it can become today's session.
    const monsters = await deps.repositories.monsters.all();
    const caught = monsters.filter((one) => one.caughtAt !== null);
    const unfinished =
      today.kind === 'crisis'
        ? []
        : (await deps.repositories.tasks.where('localDate', state.localDate)).filter(
            (task) => task.status !== 'finished',
          );
    const waiting = unfinished.flatMap((task) => {
      const its = monsters.find((one) => one.taskId === task.id && one.caughtAt === null);
      return its ? [{ task, monster: its }] : [];
    });
    const images = await shareMonsterImages(
      [...(monster ? [monster] : []), ...waiting.map((one) => one.monster)],
      deps.painter,
      deps.files,
    );
    const latest = caught.reduce<(typeof caught)[number] | null>(
      (last, one) => (last === null || (one.caughtAt ?? '') > (last.caughtAt ?? '') ? one : last),
      null,
    );
    const live = state.session !== null && TIMED.includes(state.session.phase);
    const snapshot = buildSurfaceSnapshot({
      today,
      settings: state.settings,
      monster,
      monsterImage: monster ? (images.get(monster.id) ?? null) : null,
      shownLine: live ? (state.line?.text ?? null) : null,
      weekBars: (await deps.repositories.recordBars.where('week', isoWeekOf(state.localDate).week))
        .length,
      worldThings: finishedThings(await deps.repositories.worldPieces.all()),
      plus,
      accent,
      localDate: state.localDate,
      waiting: waiting.map((one): WaitingThing => ({
        ...one,
        image: images.get(one.monster.id) ?? null,
      })),
      finish,
      shelf: caught.length,
      latestCatch:
        latest?.caughtAt != null
          ? { name: latest.name, caughtAt: instantFromIso(latest.caughtAt) }
          : null,
      dayEndsAt: instantOfLocal(
        addDays(state.localDate, 1),
        `${String(DAY_ROLLOVER_HOUR).padStart(2, '0')}:00`,
        deps.timeZone(),
      ),
    });
    const json = JSON.stringify(snapshot);
    if (json === lastJson) return;
    shared.set(SHARED_KEYS.snapshot, json);
    shared.reloadSurfaces();
    lastJson = json;
  }

  /** The hunt record the Lock Screen's buttons move, or `null` when there is none to read. */
  const storedHunt = () => {
    try {
      return readHunt(shared.get(SHARED_KEYS.hunt));
    } catch {
      return null;
    }
  };

  const sync = () => {
    queue = queue.then(write).catch(() => undefined);
    return queue;
  };

  return {
    /** Writes the snapshot now if it changed. Resolves when it is written. */
    sync,
    /** Follows the store until the returned function is called. */
    follow(): () => void {
      void sync();
      return store.subscribe(() => void sync());
    },
    /**
     * Called at launch and each time the app comes to the front: dispatches every pending action
     * once, in the order asked, and returns them. Opening Scootch in the middle of a session with
     * nothing asked for is a pick-up.
     */
    async opened() {
      if (!store.getState().ready) return [];
      const actions = pending.take();
      for (const action of actions) {
        if (isDayAction(action.kind)) {
          await store.dispatch({ type: 'surface_action', action: action.kind });
        }
      }
      // A hunt begun or moved outside the app is taken up before anything else is noticed.
      const hunt = storedHunt();
      if (hunt !== null) await store.dispatch({ type: 'hunt_adopted', hunt });
      if (actions.length === 0) await store.dispatch({ type: 'opened_mid_session' });
      return actions;
    },
  };
}

export type SurfaceSync = ReturnType<typeof createSurfaceSync>;
