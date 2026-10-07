import {
  dayRowSchema,
  drawerItemRowSchema,
  isoFromInstant,
  monsterRowSchema,
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

/** How much a phone or a snapshot holds, for telling a fuller one from an emptier one. */
export interface Holdings {
  readonly tasks: readonly unknown[];
  readonly monsters: readonly unknown[];
  readonly drawerItems: readonly unknown[];
  readonly sessions: readonly unknown[];
  readonly worldPieces: readonly unknown[];
}

export function weightOf(held: Holdings): number {
  return (
    held.tasks.length +
    held.monsters.length +
    held.drawerItems.length +
    held.sessions.length +
    held.worldPieces.length
  );
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
 * snapshot's row for that day.
 */
export async function restoreSnapshot(
  repositories: Repositories,
  snapshot: unknown,
): Promise<'restored' | 'refused'> {
  const parsed = parseSnapshot(snapshot);
  if (parsed === null) return 'refused';
  const fresh = await isFreshDatabase(repositories);
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
  });
  return 'restored';
}
