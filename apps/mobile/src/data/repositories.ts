import type { Id } from '@scootch/domain';

import { careReminders } from './care-reminder';
import { rambleTranscripts } from './ramble-transcripts';
import { daysRepository } from './repositories/days';
import { drawerItemsRepository } from './repositories/drawer-items';
import { monstersRepository } from './repositories/monsters';
import { parkedThoughtsRepository } from './repositories/parked-thoughts';
import { recordBarsRepository } from './repositories/record-bars';
import { sessionsRepository } from './repositories/sessions';
import { settingsRepository } from './repositories/settings';
import { surpriseDropsRepository } from './repositories/surprise-drops';
import { tasksRepository } from './repositories/tasks';
import { weekRecordsRepository } from './repositories/week-records';
import { worldPiecesRepository } from './repositories/world-pieces';
import type { SqlDatabase } from './table';
import { unsortedWordsStore } from './unsorted-words';

/** Every local table, opened on one database. The phone is the source of truth. */
export function openRepositories(db: SqlDatabase) {
  const tasks = tasksRepository(db);
  const monsters = monstersRepository(db);
  const sessions = sessionsRepository(db);
  const parkedThoughts = parkedThoughtsRepository(db);

  /**
   * Letting a task go: its row, its monster, its sessions and the thoughts parked in them are
   * deleted together. Nothing about it is kept anywhere.
   */
  const forgetTask = (taskId: Id) =>
    db.withTransactionAsync(async () => {
      for (const session of await sessions.where('taskId', taskId)) {
        await parkedThoughts.removeWhere('sessionId', session.id);
      }
      await sessions.removeWhere('taskId', taskId);
      await monsters.removeWhere('taskId', taskId);
      await tasks.remove(taskId);
    });

  return {
    days: daysRepository(db),
    tasks,
    drawerItems: drawerItemsRepository(db),
    monsters,
    sessions,
    parkedThoughts,
    worldPieces: worldPiecesRepository(db),
    recordBars: recordBarsRepository(db),
    weekRecords: weekRecordsRepository(db),
    surpriseDrops: surpriseDropsRepository(db),
    settings: settingsRepository(db),
    transcripts: rambleTranscripts(db),
    careReminder: careReminders(db),
    unsortedWords: unsortedWordsStore(db),
    forgetTask,
    transaction: (task: () => Promise<void>) => db.withTransactionAsync(task),
  };
}

export type Repositories = ReturnType<typeof openRepositories>;
