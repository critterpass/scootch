import {
  addDays,
  dayRowSchema,
  drawerItemRowSchema,
  isoFromInstant,
  monsterRowSchema,
  parkTasks,
  parkedThoughtRowSchema,
  recordBarRowSchema,
  sessionRowSchema,
  settingsRowSchema,
  taskRowSchema,
  weekRecordRowSchema,
  worldPieceRowSchema,
  type DayRow,
  type DrawerItemRow,
  type Instant,
  type IsoDate,
  type MonsterRow,
  type ParkedThoughtRow,
  type RecordBarRow,
  type SessionRow,
  type SettingsRow,
  type TaskRow,
  type WeekRecordRow,
  type WorldPieceRow,
} from '@scootch/domain';

import type { Repositories } from '../../data/repositories';
import {
  surpriseDropRowSchema,
  type SurpriseDropRow,
} from '../../data/repositories/surprise-drops';

export const SNAPSHOT_VERSION = 1;

/** A crisis day in a snapshot: its date and its status, and nothing else. */
export interface CrisisDay {
  readonly localDate: IsoDate;
  readonly status: 'crisis';
}

/** The settings the person has, without a language they never chose. */
export type StoredSettings = Partial<Omit<SettingsRow, 'id'>>;

/**
 * Everything needed to bring the world back on another phone, as plain JSON.
 *
 * It has no ramble transcript: the `ramble_transcripts` table is never read here. A crisis text
 * is not in it either, because one is never stored anywhere on the phone in the first place; the
 * day it happened on is carried as its date and status only.
 */
export interface Snapshot {
  readonly version: typeof SNAPSHOT_VERSION;
  readonly takenAt: string;
  readonly days: readonly (DayRow | CrisisDay)[];
  readonly tasks: readonly TaskRow[];
  readonly drawerItems: readonly DrawerItemRow[];
  readonly monsters: readonly MonsterRow[];
  readonly sessions: readonly SessionRow[];
  readonly parkedThoughts: readonly ParkedThoughtRow[];
  readonly worldPieces: readonly WorldPieceRow[];
  readonly recordBars: readonly RecordBarRow[];
  readonly weekRecords: readonly WeekRecordRow[];
  readonly surpriseDrops: readonly SurpriseDropRow[];
  readonly settings: StoredSettings;
}

/**
 * The settings row without its key. The language is left out while it still follows the phone:
 * reading with two different phone languages gives two answers only when none was ever chosen.
 */
export async function readStoredSettings(repositories: Repositories): Promise<StoredSettings> {
  const { id: _id, language, ...rest } = await repositories.settings.read('en');
  const other = await repositories.settings.read('vi');
  return other.language === language ? { ...rest, language } : rest;
}

/**
 * True while nothing has been made on this phone: no task, monster, drawer item, session or
 * world piece. Day rows do not count: the app opens today as it starts, before any screen.
 */
export async function isFreshDatabase(repositories: Repositories): Promise<boolean> {
  const made = await Promise.all([
    repositories.tasks.all(),
    repositories.monsters.all(),
    repositories.drawerItems.all(),
    repositories.sessions.all(),
    repositories.worldPieces.all(),
  ]);
  return made.every((rows) => rows.length === 0);
}

/** The rows that make a world, each with an id. */
type World = Pick<Snapshot, 'tasks' | 'monsters' | 'drawerItems' | 'sessions' | 'worldPieces'>;
const WORLD = ['tasks', 'monsters', 'drawerItems', 'sessions', 'worldPieces'] as const;

/** True when every task, monster, drawer item, session and world piece of `other` is in `mine`. */
export function holdsAll(mine: World, other: World): boolean {
  return WORLD.every((table) => {
    const ids = new Set(mine[table].map((row) => row.id));
    return other[table].every((row) => ids.has(row.id));
  });
}

export async function buildSnapshot(repositories: Repositories, now: Instant): Promise<Snapshot> {
  const days = await repositories.days.all();
  return {
    version: SNAPSHOT_VERSION,
    takenAt: isoFromInstant(now),
    days: days.map((day) =>
      day.status === 'crisis' ? { localDate: day.localDate, status: 'crisis' } : day,
    ),
    tasks: await repositories.tasks.all(),
    drawerItems: await repositories.drawerItems.all(),
    monsters: await repositories.monsters.all(),
    sessions: await repositories.sessions.all(),
    parkedThoughts: await repositories.parkedThoughts.all(),
    worldPieces: await repositories.worldPieces.all(),
    recordBars: await repositories.recordBars.all(),
    weekRecords: await repositories.weekRecords.all(),
    surpriseDrops: await repositories.surpriseDrops.all(),
    settings: await readStoredSettings(repositories),
  };
}

const crisisDaySchema = dayRowSchema.pick({ localDate: true, status: true });
const storedSettingsSchema = settingsRowSchema.omit({ id: true }).partial();

/** A crisis day comes back as a full row with nothing in it; its opening time is the day's start. */
function dayRowOf(entry: unknown): DayRow {
  const full = dayRowSchema.safeParse(entry);
  if (full.success && full.data.status !== 'crisis') return full.data;
  const { localDate, status } = crisisDaySchema.parse(entry);
  if (status !== 'crisis') throw new Error('A day row is incomplete');
  return dayRowSchema.parse({
    localDate,
    status,
    openedAt: `${localDate}T00:00:00.000Z`,
    morningLine: null,
    energy: null,
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface ParsedSnapshot extends Omit<Snapshot, 'days'> {
  readonly days: readonly DayRow[];
}

/**
 * Checks a snapshot against the row contracts. `null` for anything that is not a snapshot of the
 * version this app writes: a newer app's snapshot is refused whole, never half understood.
 */
function parseSnapshot(value: unknown): ParsedSnapshot | null {
  if (!isRecord(value) || value['version'] !== SNAPSHOT_VERSION) return null;
  if (typeof value['takenAt'] !== 'string') return null;
  const { days, surpriseDrops, settings } = value;
  if (!Array.isArray(days) || !Array.isArray(surpriseDrops)) return null;
  try {
    return {
      version: SNAPSHOT_VERSION,
      takenAt: value['takenAt'],
      days: days.map(dayRowOf),
      tasks: taskRowSchema.array().parse(value['tasks']),
      drawerItems: drawerItemRowSchema.array().parse(value['drawerItems']),
      monsters: monsterRowSchema.array().parse(value['monsters']),
      sessions: sessionRowSchema.array().parse(value['sessions']),
      parkedThoughts: parkedThoughtRowSchema.array().parse(value['parkedThoughts']),
      worldPieces: worldPieceRowSchema.array().parse(value['worldPieces']),
      recordBars: recordBarRowSchema.array().parse(value['recordBars']),
      weekRecords: weekRecordRowSchema.array().parse(value['weekRecords']),
      surpriseDrops: surpriseDrops.map((drop) => surpriseDropRowSchema.parse(drop)),
      settings: Object.fromEntries(
        Object.entries(storedSettingsSchema.parse(settings)).filter(
          ([, field]) => field !== undefined,
        ),
      ),
    };
  } catch {
    return null;
  }
}

/** True when `value` is a snapshot this app can restore. */
export function isRestorableSnapshot(value: unknown): value is Snapshot {
  return parseSnapshot(value) !== null;
}

interface Mine {
  readonly tasks: ReadonlySet<string>;
  readonly monsters: readonly MonsterRow[];
  readonly today: IsoDate | null;
}

/** After a world was added to a phone in use: its cards are renumbered and its open things parked. */
async function settleAdded(
  repositories: Repositories,
  parsed: ParsedSnapshot,
  mine: Mine,
  now: Instant,
): Promise<void> {
  const here = new Set(mine.monsters.map((row) => row.id));
  let number = Math.max(0, ...mine.monsters.map((row) => row.number ?? 0));
  const caught = parsed.monsters
    .filter((row) => !here.has(row.id) && row.number !== null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  for (const row of caught) await repositories.monsters.put({ ...row, number: (number += 1) });

  const today = mine.today;
  const open = parsed.tasks.filter((row) => !mine.tasks.has(row.id) && row.status !== 'finished');
  if (today === null || open.length === 0) return;
  const { drawer, replacedIds } = parkTasks({
    drawer: await repositories.drawerItems.all(),
    tasks: open,
    today,
    now,
  });
  for (const id of replacedIds) await repositories.drawerItems.remove(id);
  for (const task of open) {
    const item = drawer.find((one) => one.id === task.id);
    if (item) await repositories.drawerItems.put(item);
    // A parked task is never dated today or later: it waits in the drawer, not on a day.
    if (task.localDate >= today) {
      await repositories.tasks.put({ ...task, localDate: addDays(today, -1) });
    }
  }
}

/** A day the app only opened: nothing was answered, finished or rested on it. */
const untouched = (day: DayRow) =>
  day.status === 'open' && day.energy === null && day.morningLine === null;

/**
 * Writes a snapshot into the database, in one transaction. A snapshot of an unknown version or a
 * malformed one is refused, and then nothing is written.
 *
 * On a phone with nothing made, the snapshot comes back whole, settings included. On a phone that
 * already holds things, the snapshot is added to them: a row the phone already has stays as the
 * phone has it, and the phone's settings stay. A day the app merely opened gives way to the
 * snapshot's row for that day. Two things keep the added world from colliding with the one here:
 * restored cards are numbered after the ones caught on this phone, and every restored thing that
 * is not finished goes to the drawer whole, so no day ends up with a second open task.
 *
 * A thing let go on this phone leaves no trace, so it cannot be recognised in a snapshot. It does
 * not need to be: a phone only ever restores a copy it has not uploaded to, which cannot hold
 * anything made, and so anything let go, on this phone.
 */
export async function restoreSnapshot(
  repositories: Repositories,
  snapshot: unknown,
  now: Instant = Date.parse(isRecord(snapshot) ? String(snapshot['takenAt']) : '') || 0,
): Promise<'restored' | 'refused'> {
  const parsed = parseSnapshot(snapshot);
  if (parsed === null) return 'refused';
  const fresh = await isFreshDatabase(repositories);
  // What was here before anything is added, to tell the added rows from the phone's own.
  const mine = {
    tasks: new Set((await repositories.tasks.all()).map((row) => row.id)),
    monsters: await repositories.monsters.all(),
    today: (await repositories.days.all()).at(-1)?.localDate ?? null,
  };
  await repositories.transaction(async () => {
    for (const row of parsed.days) {
      const local = await repositories.days.get(row.localDate);
      if (!local || untouched(local)) await repositories.days.put(row);
    }
    const add = async <Row>(
      table: { get(key: string): Promise<Row | null>; put(row: Row): Promise<void> },
      rows: readonly Row[],
      keyOf: (row: Row) => string,
    ) => {
      for (const row of rows) if (fresh || !(await table.get(keyOf(row)))) await table.put(row);
    };
    const byId = (row: { readonly id: string }) => row.id;
    await add(repositories.tasks, parsed.tasks, byId);
    await add(repositories.drawerItems, parsed.drawerItems, byId);
    await add(repositories.monsters, parsed.monsters, byId);
    await add(repositories.sessions, parsed.sessions, byId);
    await add(repositories.parkedThoughts, parsed.parkedThoughts, byId);
    await add(repositories.worldPieces, parsed.worldPieces, byId);
    await add(repositories.recordBars, parsed.recordBars, (row) => row.localDate);
    await add(repositories.weekRecords, parsed.weekRecords, (row) => row.week);
    await add(repositories.surpriseDrops, parsed.surpriseDrops, byId);
    if (fresh) await repositories.settings.write(parsed.settings);
    else await settleAdded(repositories, parsed, mine, now);
  });
  return 'restored';
}
