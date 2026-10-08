import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import {
  dayRowSchema,
  monsterRowSchema,
  taskRowSchema,
  type DayRow,
  type MonsterRow,
  type SessionRow,
  type TaskRow,
} from '@scootch/domain';

import { type Migration, type MigrationDatabase, runMigrations } from '../../db/migrate';
import { isRestorableSnapshot, restoreSnapshot } from '../../features/backup/snapshot';
import { openRepositories } from '../repositories';
import type { SqlDatabase, SqlValue } from '../table';

// A real SQLite database in memory, from Node's own module. Jest's module loader does not know
// `node:sqlite`, so it is taken from the process instead of imported.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const MIGRATIONS_DIR = join(__dirname, '../../db/migrations');
/** The last schema change before the starting helpers' columns. */
const LAST_BEFORE = '0007-add-task-soft-until';

function appMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({
      name: file.replace(/\.ts$/, ''),
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- the folder is the list
      sql: (require(join(MIGRATIONS_DIR, file)) as { sql: string }).sql,
    }));
}

/** An in-memory database, brought up to the schema of an earlier app or of this one. */
function openDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const transaction = async (task: () => Promise<void>) => {
    sqlite.exec('BEGIN');
    try {
      await task();
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };
  const migrationDb: MigrationDatabase = {
    execAsync: (source) => Promise.resolve(sqlite.exec(source)),
    getAllAsync: <T>(source: string) => Promise.resolve(sqlite.prepare(source).all() as T[]),
    runAsync: (source, params) => Promise.resolve(sqlite.prepare(source).run(...params)),
    withTransactionAsync: transaction,
  };
  const db: SqlDatabase = {
    getAllAsync: <T>(source: string, params: SqlValue[]) =>
      Promise.resolve(
        sqlite
          .prepare(source)
          .all(...params)
          .map((row) => ({ ...row })) as T[],
      ),
    runAsync: (source, params) => Promise.resolve(sqlite.prepare(source).run(...params)),
    withTransactionAsync: transaction,
  };
  const tables = () =>
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> '_migrations'")
      .all()
      .map((row) => String(row['name']));
  return {
    db,
    exec: (source: string) => sqlite.exec(source),
    migrate: (upTo?: string) =>
      runMigrations(
        migrationDb,
        appMigrations().filter((one) => upTo === undefined || one.name <= upTo),
      ),
    dump: () =>
      JSON.stringify(tables().map((table) => sqlite.prepare(`SELECT * FROM ${table}`).all())),
    rowCount: () =>
      tables().reduce(
        (sum, table) =>
          sum + Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']),
        0,
      ),
  };
}

// The rows as they were before the fields: none of the new keys, not even as null.
const dayBefore = {
  localDate: '2026-10-06',
  status: 'open',
  openedAt: '2026-10-06T09:00:00.000Z',
  morningLine: null,
  energy: 'medium',
} satisfies DayRow;

const taskBefore = {
  id: 'task-1',
  localDate: '2026-10-06',
  text: 'Email the dentist',
  originalText: 'Email the dentist about Thursday',
  source: 'ramble',
  screen: 'pass',
  seriousOverridden: false,
  status: 'set',
  carriedOver: false,
  firstMentionedOn: '2026-10-01',
  dueDate: null,
  workMode: null,
  fitsTenMinutes: true,
  sharePrivate: false,
  shrinkCount: 0,
  lines: null,
  notifications: [{ text: 'One small start?' }],
  createdAt: '2026-10-06T09:01:00.000Z',
  finishedAt: null,
} satisfies TaskRow;

const monsterBefore = {
  id: 'monster-1',
  taskId: 'task-1',
  origin: 'task',
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
  name: 'Molar, Keeper of the Unsent',
  title: 'Inbox dweller',
  flavourText: 'Lives behind the reply button.',
  hatchedAt: '2026-10-06T09:01:05.000Z',
  caughtAt: '2026-10-06T09:20:00.000Z',
  caughtOn: '2026-10-06',
  number: 1,
  rarity: 'common',
  daysLurked: 5,
  catchMinutes: 11,
  dread: 2,
  finish: 'paper',
} satisfies MonsterRow;

const session: SessionRow = {
  id: 'session-1',
  taskId: 'task-1',
  localDate: '2026-10-06',
  plannedMinutes: 25,
  treat: null,
  startedAt: '2026-10-06T09:05:00.000Z',
  endsAt: '2026-10-06T09:30:00.000Z',
  endedAt: '2026-10-06T09:30:00.000Z',
  outcome: 'not_finished',
  finishMethod: null,
  notFinishedChoice: 'carry_on',
  tableId: null,
};

/** Every field the helpers store, filled in. */
const taskWithHelpers: TaskRow = {
  ...taskBefore,
  guessMinutes: 120,
  startCue: { kind: 'moment', moment: 'lunch' },
  inTheWay: 'scary',
  nextStart: { text: 'Open the draft and read the last line', writtenOn: '2026-10-06' },
};

const text = (value: unknown) => `'${JSON.stringify(value)}'`;

describe('the fields the starting helpers store', () => {
  it('reads rows an earlier app stored, with nothing in the new fields', async () => {
    const database = openDatabase();
    await database.migrate(LAST_BEFORE);
    // Written as that app wrote them: its own columns, by name.
    database.exec(`
      INSERT INTO days (local_date, status, opened_at, morning_line, energy)
        VALUES ('2026-10-06', 'open', '2026-10-06T09:00:00.000Z', NULL, 'medium');
      INSERT INTO tasks (id, local_date, text, original_text, source, screen, serious_overridden,
          status, carried_over, first_mentioned_on, due_date, work_mode, fits_ten_minutes,
          share_private, shrink_count, lines, notifications, created_at, finished_at)
        VALUES ('task-1', '2026-10-06', 'Email the dentist', 'Email the dentist about Thursday',
          'ramble', 'pass', 0, 'set', 0, '2026-10-01', NULL, NULL, 1, 0, 0, NULL,
          ${text(taskBefore.notifications)}, '2026-10-06T09:01:00.000Z', NULL);
      INSERT INTO monsters (id, task_id, origin, spec, name, title, flavour_text, hatched_at,
          caught_at, caught_on, number, rarity, days_lurked, catch_minutes, dread, finish)
        VALUES ('monster-1', 'task-1', 'task', ${text(monsterBefore.spec)},
          'Molar, Keeper of the Unsent', 'Inbox dweller', 'Lives behind the reply button.',
          '2026-10-06T09:01:05.000Z', '2026-10-06T09:20:00.000Z', '2026-10-06', 1, 'common', 5,
          11, 2, 'paper');
    `);

    expect(await database.migrate()).toEqual(['0008-add-starting-helper-fields']);
    const repositories = openRepositories(database.db);

    // Each reads as that app read it: the new fields are not there at all, not even as null.
    const day = await repositories.days.get('2026-10-06');
    const task = await repositories.tasks.get('task-1');
    const monster = await repositories.monsters.get('monster-1');
    expect(day).toStrictEqual(dayBefore);
    expect(task).toStrictEqual({ ...taskBefore, bitesCaught: null, softUntil: null });
    expect(monster).toStrictEqual({ ...monsterBefore, signed: null });
  });

  it('parses a row written before the fields, and refuses a value outside them', () => {
    expect(dayRowSchema.parse(dayBefore)).toEqual(dayBefore);
    expect(taskRowSchema.parse(taskBefore)).toEqual(taskBefore);
    expect(monsterRowSchema.parse(monsterBefore)).toEqual(monsterBefore);

    expect(taskRowSchema.safeParse({ ...taskBefore, guessMinutes: 45 }).success).toBe(false);
    expect(taskRowSchema.safeParse({ ...taskBefore, inTheWay: 'lazy' }).success).toBe(false);
    expect(
      taskRowSchema.safeParse({ ...taskBefore, startCue: { kind: 'moment', moment: 'nap' } })
        .success,
    ).toBe(false);
    expect(monsterRowSchema.safeParse({ ...monsterBefore, oddWord: 'huge' }).success).toBe(false);
  });

  it('stores every new field and reads it back as written', async () => {
    const database = openDatabase();
    await database.migrate();
    const repositories = openRepositories(database.db);
    const day: DayRow = {
      ...dayBefore,
      heardTime: { at: '15:00', heardAs: 'dentist at 3', watched: true },
    };
    const atATime: TaskRow = {
      ...taskWithHelpers,
      id: 'task-2',
      startCue: { kind: 'time', at: '16:45' },
    };
    const monster: MonsterRow = { ...monsterBefore, guessMinutes: 120, oddWord: 'tiny' };

    await repositories.days.put(day);
    await repositories.tasks.put(taskWithHelpers);
    await repositories.tasks.put(atATime);
    await repositories.monsters.put(monster);

    expect(await repositories.days.get(day.localDate)).toEqual(day);
    expect(await repositories.tasks.get('task-1')).toMatchObject(taskWithHelpers);
    expect(await repositories.tasks.get('task-2')).toMatchObject(atATime);
    expect(await repositories.monsters.get(monster.id)).toMatchObject(monster);

    // Cleared with null, a field is gone from the row.
    await repositories.tasks.put({ ...taskWithHelpers, nextStart: null, startCue: null });
    const cleared = await repositories.tasks.get('task-1');
    expect(cleared).toMatchObject({ guessMinutes: 120, inTheWay: 'scary' });
    expect(cleared).not.toHaveProperty('nextStart');
    expect(cleared).not.toHaveProperty('startCue');
  });

  it('restores a backup written before the fields', async () => {
    const before = {
      version: 1,
      takenAt: '2026-10-06T10:00:00.000Z',
      days: [dayBefore],
      tasks: [taskBefore],
      drawerItems: [],
      monsters: [monsterBefore],
      sessions: [session],
      parkedThoughts: [],
      worldPieces: [],
      recordBars: [],
      weekRecords: [],
      surpriseDrops: [],
      // The settings an earlier app had: no day moments, no lead, no switch for the count.
      settings: { attitude: 'soft', quietHoursStart: '22:00', quietHoursEnd: '07:00' },
    };
    expect(isRestorableSnapshot(before)).toBe(true);

    const database = openDatabase();
    await database.migrate();
    const repositories = openRepositories(database.db);
    expect(await restoreSnapshot(repositories, before)).toBe('restored');

    expect(await repositories.tasks.get('task-1')).toStrictEqual({
      ...taskBefore,
      bitesCaught: null,
      softUntil: null,
    });
    expect(await repositories.monsters.get('monster-1')).toStrictEqual({
      ...monsterBefore,
      signed: null,
    });
    expect(await repositories.days.get('2026-10-06')).toStrictEqual(dayBefore);
    // What the backup never held reads as its default.
    expect(await repositories.settings.read('en')).toMatchObject({
      attitude: 'soft',
      quietHoursStart: '22:00',
      lunchAt: '13:10',
      getReadyLeadMinutes: 35,
      othersHunting: true,
    });
  });

  it('keeps the day moments, the get-ready lead and the count switch in the settings', async () => {
    const database = openDatabase();
    await database.migrate();
    const { settings } = openRepositories(database.db);

    expect(await settings.read('en')).toMatchObject({
      coffeeAt: '09:00',
      lunchAt: '13:10',
      workAt: '17:30',
      dinnerAt: '19:30',
      bedAt: '20:30',
      getReadyLeadMinutes: 35,
      othersHunting: true,
    });

    await settings.write({ lunchAt: '12:30', getReadyLeadMinutes: 20, othersHunting: false });
    const changed = await settings.read('en');
    expect(changed).toMatchObject({
      lunchAt: '12:30',
      getReadyLeadMinutes: 20,
      othersHunting: false,
      // A change to these leaves every other setting as it was.
      attitude: 'cheeky',
      dinnerAt: '19:30',
    });

    // Cleared, a value is the fixed default once more.
    await settings.write({ lunchAt: null, getReadyLeadMinutes: null });
    expect(await settings.read('en')).toMatchObject({ lunchAt: '13:10', getReadyLeadMinutes: 35 });
  });

  it('leaves nothing of a task that is let go, whatever the helpers stored on it', async () => {
    const database = openDatabase();
    await database.migrate();
    const repositories = openRepositories(database.db);
    await repositories.tasks.put(taskWithHelpers);
    await repositories.monsters.put({ ...monsterBefore, guessMinutes: 120, oddWord: 'tiny' });
    await repositories.sessions.put(session);
    expect(database.dump()).toContain('Open the draft');

    await repositories.forgetTask('task-1');

    expect(database.rowCount()).toBe(0);
    expect(database.dump()).not.toContain('Open the draft');
  });
});
