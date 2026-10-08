import type {
  DayRow,
  DrawerItemRow,
  MonsterRow,
  ParkedThoughtRow,
  RecordBarRow,
  SessionRow,
  TaskRow,
  WeekRecordRow,
  WorldPieceRow,
} from '@scootch/domain';

import type { Repositories } from '../../../data/repositories';
import type { SurpriseDropRow } from '../../../data/repositories/surprise-drops';
import type { BackupTokenStore } from '../backup-token';

// A small world for the backup and privacy tests: one finished day with its caught monster, a
// drawer item, and an earlier crisis day that also has an ordinary task on it.

export const TOKEN = 'k'.repeat(43);
export const CRISIS_DATE = '2026-10-05';
export const CRISIS_DAY_TASK_TEXT = 'Water the fern on the landing';
export const CRISIS_DAY_LINE = 'Morning line of the quiet day';

export const day: DayRow = {
  localDate: '2026-10-06',
  status: 'done',
  openedAt: '2026-10-06T09:00:00.000Z',
  morningLine: 'Up we get.',
  energy: 'medium',
};

export const crisisDay: DayRow = {
  localDate: CRISIS_DATE,
  status: 'crisis',
  openedAt: '2026-10-05T08:30:00.000Z',
  morningLine: CRISIS_DAY_LINE,
  energy: 'low',
};

export const task: TaskRow = {
  id: 'task-1',
  localDate: '2026-10-06',
  text: 'Call the plumber',
  originalText: 'Call the plumber about the leak under the sink',
  source: 'ramble',
  screen: 'pass',
  seriousOverridden: false,
  status: 'finished',
  carriedOver: false,
  firstMentionedOn: '2026-10-01',
  dueDate: null,
  workMode: 'calling',
  fitsTenMinutes: true,
  sharePrivate: false,
  shrinkCount: 1,
  lines: null,
  notifications: [{ text: 'One small start?' }],
  createdAt: '2026-10-06T09:01:00.000Z',
  bitesCaught: null,
  softUntil: null,
  finishedAt: '2026-10-06T09:28:00.000Z',
};

export const crisisDayTask: TaskRow = {
  ...task,
  id: 'task-0',
  localDate: CRISIS_DATE,
  text: CRISIS_DAY_TASK_TEXT,
  originalText: CRISIS_DAY_TASK_TEXT,
  status: 'set',
  createdAt: '2026-10-05T08:31:00.000Z',
  bitesCaught: null,
  softUntil: null,
  finishedAt: null,
};

export const monster: MonsterRow = {
  id: 'monster-1',
  taskId: 'task-1',
  origin: 'task',
  // Caught before the server signed its words: the column is there, and empty.
  signed: null,
  spec: {
    bodyType: 'phone',
    seed: 'task-1',
    ink: 'navy',
    size: 0.8,
    eyes: { count: 2, style: 'mismatched' },
    mouth: 'zigzag',
    horns: 'short',
    antennae: 0,
    legs: 'stub',
  },
  name: 'Drip Van Winkle',
  title: 'Sink lurker',
  flavourText: 'Collects washers.',
  hatchedAt: '2026-10-06T09:01:05.000Z',
  caughtAt: '2026-10-06T09:28:00.000Z',
  caughtOn: '2026-10-06',
  number: 1,
  rarity: 'common',
  daysLurked: 5,
  catchMinutes: 23,
  dread: 2,
  finish: 'paper',
};

export const session: SessionRow = {
  id: 'session-1',
  taskId: 'task-1',
  localDate: '2026-10-06',
  plannedMinutes: 25,
  treat: 'a coffee',
  startedAt: '2026-10-06T09:05:00.000Z',
  endsAt: '2026-10-06T09:30:00.000Z',
  endedAt: '2026-10-06T09:28:00.000Z',
  outcome: 'finished',
  finishMethod: 'hold',
  notFinishedChoice: null,
  tableId: null,
};

export const thought: ParkedThoughtRow = {
  id: 'thought-1',
  sessionId: 'session-1',
  text: 'Buy washers',
  parkedAt: '2026-10-06T09:10:00.000Z',
  resolution: 'keep',
};

export const drawerItem: DrawerItemRow = {
  id: 'drawer-1',
  text: 'Council tax',
  screen: 'pass',
  dueDate: '2026-10-09',
  firstMentionedOn: '2026-10-06',
  lastMentionedOn: '2026-10-06',
  returnOn: '2026-10-08',
  fadesOn: null,
  createdAt: '2026-10-06T09:01:00.000Z',
};

export const worldPiece: WorldPieceRow = {
  id: 'piece-1',
  kind: 'monster',
  monsterId: 'monster-1',
  x: 0.25,
  y: 0.75,
  seed: 'task-1',
  addedOn: '2026-10-06',
};

export const recordBar: RecordBarRow = {
  localDate: '2026-10-06',
  week: '2026-W41',
  position: 2,
  instrument: 'bassline',
  seed: 'task-1',
  monsterId: 'monster-1',
};

export const weekRecord: WeekRecordRow = {
  week: '2026-W41',
  name: 'Songs for a sink',
  linerNote: null,
  sentence: null,
};

export const surpriseDrop: SurpriseDropRow = {
  id: 'drop-1',
  taskId: 'task-1',
  catchNumber: 1,
  pick: 0.5,
  droppedOn: '2026-10-06',
  choice: 'wear',
};

/** Writes the whole sample world through the repositories, as the app would. */
export async function fillWorld(repositories: Repositories): Promise<void> {
  await repositories.days.put(crisisDay);
  await repositories.days.put(day);
  await repositories.tasks.put(crisisDayTask);
  await repositories.tasks.put(task);
  await repositories.monsters.put(monster);
  await repositories.sessions.put(session);
  await repositories.parkedThoughts.put(thought);
  await repositories.drawerItems.put(drawerItem);
  await repositories.worldPieces.put(worldPiece);
  await repositories.recordBars.put(recordBar);
  await repositories.weekRecords.put(weekRecord);
  await repositories.surpriseDrops.put(surpriseDrop);
  await repositories.settings.write({ attitude: 'unhinged', music: false, language: 'vi' });
}

/** A token store in memory. Switched off, every call throws, as the real ones do. */
export function memoryStore(initial: string | null = null) {
  const store = { value: initial, off: false };
  const whenOn = <T>(act: () => T): Promise<T> =>
    store.off ? Promise.reject(new Error('This store is switched off')) : Promise.resolve(act());
  const calls: BackupTokenStore = {
    read: () => whenOn(() => store.value),
    write: (token) =>
      whenOn(() => {
        store.value = token;
      }),
    clear: () =>
      whenOn(() => {
        store.value = null;
      }),
  };
  return Object.assign(store, calls);
}
