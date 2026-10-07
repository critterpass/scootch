import { DAY_ROLLOVER_HOUR, addDays, instantOfLocal, isoWeekOf } from '@scootch/domain';

import type { Repositories } from '../../data/repositories';
import type { DayStore } from '../../state/day-store';
import type { DayState } from '../../state/day-types';

import { finishedThings } from '../world/landmarks';

import { shareMonsterImage } from './monster-image';
import { createPendingActions } from './pending-actions';
import {
  SHARED_KEYS,
  type MonsterPainter,
  type SharedFiles,
  type SharedStore,
} from './surface-ports';
import { buildSurfaceSnapshot } from './surface-snapshot';

export interface SurfaceSyncDeps {
  readonly store: DayStore;
  readonly repositories: Pick<Repositories, 'recordBars' | 'worldPieces'>;
  readonly shared: SharedStore;
  readonly files: SharedFiles;
  readonly painter: MonsterPainter;
  readonly plus: () => boolean;
  /** The worn ink's accent as a hex colour; `null` for tomato. */
  readonly accent: () => string | null;
  readonly now: () => number;
  readonly timeZone: () => string;
}

const TIMED: readonly string[] = ['running', 'stuck', 'holding'];

/** The parts of the day a surface shows. While none of them changes, nothing is written. */
function shownParts(state: DayState, plus: boolean, accent: string | null): readonly unknown[] {
  const { settings } = state;
  return [
    state.today,
    state.monster,
    state.line,
    settings.attitude,
    settings.language,
    plus,
    accent,
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
    const parts = shownParts(state, plus, accent);
    if (lastParts && parts.every((part, index) => part === lastParts?.[index])) return;
    lastParts = parts;

    const { today } = state;
    // A serious task and a crisis day have no monster on any surface, so none is kept there.
    const monster = today.kind === 'serious' || today.kind === 'crisis' ? null : state.monster;
    const monsterImage = await shareMonsterImage(monster, deps.painter, deps.files);
    const live = state.session !== null && TIMED.includes(state.session.phase);
    const snapshot = buildSurfaceSnapshot({
      today,
      settings: state.settings,
      monster,
      monsterImage,
      shownLine: live ? (state.line?.text ?? null) : null,
      weekBars: (await deps.repositories.recordBars.where('week', isoWeekOf(state.localDate).week))
        .length,
      worldThings: finishedThings(await deps.repositories.worldPieces.all()),
      plus,
      accent,
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
        await store.dispatch({ type: 'surface_action', action: action.kind });
      }
      if (actions.length === 0) await store.dispatch({ type: 'opened_mid_session' });
      return actions;
    },
  };
}

export type SurfaceSync = ReturnType<typeof createSurfaceSync>;
