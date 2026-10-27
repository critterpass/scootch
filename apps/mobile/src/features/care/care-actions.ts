import type { DataDatabase } from '../../data/data-database';
import type { BoardStore } from '../../state/board-store';

import { writePlainCompany } from './care-memory';
import { canBeFunny } from './care-mode';

/** What care does to the board, through the board's own actions. */
export function careActions(store: BoardStore, db: DataDatabase) {
  const now = () => {
    store.tick();
    return store.getSnapshot().now;
  };

  return {
    /**
     * The person closed the crisis screen. The board comes back, nothing is asked, and he keeps
     * plain company until the next thing said is screened fresh.
     */
    async closeCrisis(): Promise<void> {
      const at = now();
      await store.closeCrisis();
      await writePlainCompany(db, { since: at.at, day: at.day }, at.at);
    },

    /** "It's fine, be funny" on a task the screen judged serious. Never on crisis. */
    async beFunny(taskId: string): Promise<boolean> {
      const task = store.getSnapshot().board.find((ranked) => ranked.task.id === taskId)?.task;
      if (task === undefined || !canBeFunny(task)) return false;
      await store.screened(taskId, 'none');
      return true;
    },

    /** Something said after the crisis screen closed has been screened and cleared. */
    async endPlainCompany(): Promise<void> {
      await writePlainCompany(db, null, now().at);
    },
  };
}

export type CareActions = ReturnType<typeof careActions>;
