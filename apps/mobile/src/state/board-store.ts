import { boardActions } from './board-actions';
import { deskActions } from './desk-actions';
import { createCore, type BoardStoreDeps } from './board-core';
import type { BoardSnapshot } from './board-view';

export type { BoardStoreDeps } from './board-core';

/**
 * The board and the desk for the screens: one external store, read with `useSyncExternalStore`.
 * Every action changes the state in memory, writes it to SQLite, then tells the screens; actions
 * run one at a time in the order they were called. `tick` reads the clock again, for the fuse,
 * pressure, time left and the day.
 */
export function createBoardStore(deps: BoardStoreDeps) {
  const core = createCore(deps);
  return {
    subscribe: (listener: () => void): (() => void) => {
      core.listeners.add(listener);
      return () => core.listeners.delete(listener);
    },
    getSnapshot: (): BoardSnapshot => core.snapshot,
    tick: (): void => core.emit(),
    ...boardActions(core),
    ...deskActions(core),
  };
}

export type BoardStore = ReturnType<typeof createBoardStore>;
