import type { ClassLanguage } from '@phusclass/voice/class';

import type {
  SessionActivityAttributes,
  SessionActivityState,
} from '../../../modules/phusclass-live-activity';
import type { BoardSnapshot } from '../../state/board-view';

import { activityPlanOf } from './activity-plan';
import type { SurfaceInputs } from './surface-inputs';
import { surfaceSnapshotOf } from './surface-snapshot';

/** The keys both sides agree on (`targets/_shared/AppGroup.swift`). */
export const SHARED_KEYS = {
  snapshot: 'surfaces.snapshot',
  pendingActions: 'surfaces.pending-actions',
} as const;

/** The App Group's key-value store, shared with the widget extension. */
export interface SharedStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Asks the system to draw every widget again. */
  reloadWidgets(): void;
}

/** The Live Activity, through the local module. Each call does nothing where there is none. */
export interface ActivityPort {
  start(
    attributes: SessionActivityAttributes,
    state: SessionActivityState,
    staleDate: number | null,
  ): Promise<void>;
  update(state: SessionActivityState, staleDate: number | null): Promise<void>;
  /** Takes every activity of the app off the Lock Screen and the Island at once. */
  endAll(): Promise<void>;
}

export interface SurfacesSync {
  /**
   * Brings the widgets' snapshot and the Live Activity in line with the board. `foreground` is
   * whether the app is in front: iOS starts a Live Activity only then, so a new one waits for it.
   */
  sync(
    board: BoardSnapshot,
    inputs: SurfaceInputs,
    language: ClassLanguage,
    foreground: boolean,
  ): void;
  /** Resolves once every call made so far has finished. */
  settled(): Promise<void>;
}

/** Writes only what changed, and calls the Live Activity one call at a time, in order. */
export function createSurfacesSync(ports: {
  readonly store: SharedStore;
  readonly activity: ActivityPort;
}): SurfacesSync {
  let written: string | null = null;
  let shown: { identity: string; state: string } | null = null;
  let begun = false;
  let queue: Promise<void> = Promise.resolve();

  const run = (work: () => Promise<void>) => {
    queue = queue.then(work).catch(() => undefined);
  };

  return {
    sync(board, inputs, language, foreground) {
      if (board.phase === 'loading') return;

      const snapshot = JSON.stringify(
        surfaceSnapshotOf(board, {
          language,
          enrolled: inputs.enrolled,
          timetable: inputs.timetable,
          night: inputs.night,
        }),
      );
      if (snapshot !== written) {
        written = snapshot;
        try {
          ports.store.set(SHARED_KEYS.snapshot, snapshot);
          ports.store.reloadWidgets();
        } catch {
          written = null;
        }
      }

      const plan = activityPlanOf(board, inputs.periodLine);
      if (plan === null) {
        // On the first sync after a launch, an activity left from before is taken down too.
        if (shown !== null || !begun) {
          shown = null;
          run(() => ports.activity.endAll());
        }
        begun = true;
        return;
      }
      const state = JSON.stringify(plan.state);
      if (shown?.identity === plan.identity) {
        if (shown.state !== state) {
          shown = { identity: plan.identity, state };
          run(() => ports.activity.update(plan.state, plan.staleDate));
        }
        return;
      }
      if (!foreground) {
        // A new activity has to wait for the app to be in front; the old one is not left up.
        if (shown !== null) {
          shown = null;
          run(() => ports.activity.endAll());
        }
        return;
      }
      begun = true;
      shown = { identity: plan.identity, state };
      run(async () => {
        await ports.activity.endAll();
        await ports.activity.start(plan.attributes, plan.state, plan.staleDate);
      });
    },
    settled: () => queue,
  };
}
