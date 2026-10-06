import {
  isoFromInstant,
  type DayRow,
  type DrawerItemRow,
  type Instant,
  type MonsterRow,
  type RecordBarRow,
  type TaskRow,
  type WeekRecordRow,
  type WorldPieceRow,
} from '@scootch/domain';

import type { Repositories } from '../../../data/repositories';
import { readStoredSettings, type CrisisDay, type StoredSettings } from '../../backup/snapshot';

/**
 * Everything the person has made in Scootch, as one object that can be written as JSON.
 *
 * It has no ramble transcript: the transcripts table is never read here. Of a crisis day it holds
 * the date and nothing else: no task, monster, record bar, world piece or drawer item of that day.
 */
export interface DataExport {
  readonly app: 'Scootch';
  readonly exportedAt: string;
  readonly days: readonly (DayRow | CrisisDay)[];
  readonly tasks: readonly TaskRow[];
  readonly monsters: readonly MonsterRow[];
  readonly records: {
    readonly bars: readonly RecordBarRow[];
    readonly weeks: readonly WeekRecordRow[];
  };
  readonly worldPieces: readonly WorldPieceRow[];
  readonly drawerItems: readonly DrawerItemRow[];
  readonly settings: StoredSettings;
}

export async function buildExport(repositories: Repositories, now: Instant): Promise<DataExport> {
  const days = await repositories.days.all();
  const crisisDates = new Set(
    days.filter((day) => day.status === 'crisis').map((day) => day.localDate),
  );
  const allTasks = await repositories.tasks.all();
  const tasks = allTasks.filter((task) => !crisisDates.has(task.localDate));
  const hiddenTasks = new Set(
    allTasks.filter((task) => crisisDates.has(task.localDate)).map((task) => task.id),
  );
  const allMonsters = await repositories.monsters.all();
  const monsters = allMonsters.filter(
    (monster) =>
      !hiddenTasks.has(monster.taskId) &&
      !(monster.caughtOn !== null && crisisDates.has(monster.caughtOn)),
  );
  const shown = new Set(monsters.map((monster) => monster.id));
  /** A bar or piece of a monster that is left out is left out with it. */
  const monsterShown = (monsterId: string | null) => monsterId === null || shown.has(monsterId);

  return {
    app: 'Scootch',
    exportedAt: isoFromInstant(now),
    days: days.map((day) =>
      day.status === 'crisis' ? { localDate: day.localDate, status: 'crisis' } : day,
    ),
    tasks,
    monsters,
    records: {
      bars: (await repositories.recordBars.all()).filter(
        (bar) => !crisisDates.has(bar.localDate) && monsterShown(bar.monsterId),
      ),
      weeks: await repositories.weekRecords.all(),
    },
    worldPieces: (await repositories.worldPieces.all()).filter(
      (piece) => !crisisDates.has(piece.addedOn) && monsterShown(piece.monsterId),
    ),
    drawerItems: (await repositories.drawerItems.all()).filter(
      (item) => !crisisDates.has(item.firstMentionedOn) && !crisisDates.has(item.lastMentionedOn),
    ),
    settings: await readStoredSettings(repositories),
  };
}

/** The two things the phone does for an export. `nativeShareDevice` has both. */
export interface ExportDevice {
  /** Writes a file and returns its address. */
  writeFile(name: string, bytes: Uint8Array): Promise<string>;
  openShareSheet(uri: string, mimeType: string): Promise<void>;
}

export interface ExportDeps {
  readonly repositories: Repositories;
  readonly clock: { now(): Instant };
  readonly device: ExportDevice;
}

/** Writes the export as one `.json` file named for the day, and opens the share sheet on it. */
export async function exportMyData(deps: ExportDeps): Promise<'shared'> {
  const now = deps.clock.now();
  const json = JSON.stringify(await buildExport(deps.repositories, now), null, 2);
  const name = `scootch-data-${isoFromInstant(now).slice(0, 10)}.json`;
  const uri = await deps.device.writeFile(name, new TextEncoder().encode(json));
  await deps.device.openShareSheet(uri, 'application/json');
  return 'shared';
}
