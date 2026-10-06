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

/** True while nothing has been made on this phone: no day, no task, no monster. */
export async function isFreshDatabase(repositories: Repositories): Promise<boolean> {
  const [days, tasks, monsters] = await Promise.all([
    repositories.days.all(),
    repositories.tasks.all(),
    repositories.monsters.all(),
  ]);
  return days.length === 0 && tasks.length === 0 && monsters.length === 0;
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

/**
 * Writes a snapshot into an empty database, in one transaction. A snapshot of an unknown version,
 * a malformed one, or a database that already holds a day, task or monster is refused, and then
 * nothing is written.
 */
export async function restoreSnapshot(
  repositories: Repositories,
  snapshot: unknown,
): Promise<'restored' | 'refused'> {
  const parsed = parseSnapshot(snapshot);
  if (parsed === null || !(await isFreshDatabase(repositories))) return 'refused';
  await repositories.transaction(async () => {
    for (const row of parsed.days) await repositories.days.put(row);
    for (const row of parsed.tasks) await repositories.tasks.put(row);
    for (const row of parsed.drawerItems) await repositories.drawerItems.put(row);
    for (const row of parsed.monsters) await repositories.monsters.put(row);
    for (const row of parsed.sessions) await repositories.sessions.put(row);
    for (const row of parsed.parkedThoughts) await repositories.parkedThoughts.put(row);
    for (const row of parsed.worldPieces) await repositories.worldPieces.put(row);
    for (const row of parsed.recordBars) await repositories.recordBars.put(row);
    for (const row of parsed.weekRecords) await repositories.weekRecords.put(row);
    for (const row of parsed.surpriseDrops) await repositories.surpriseDrops.put(row);
    await repositories.settings.write(parsed.settings);
  });
  return 'restored';
}
