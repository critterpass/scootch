import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  LOCAL_TABLES,
  dayRowSchema,
  drawerItemRowSchema,
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
  type MonsterRow,
  type ParkedThoughtRow,
  type RecordBarRow,
  type SessionRow,
  type TaskRow,
  type WeekRecordRow,
  type WorldPieceRow,
} from '@scootch/domain';

import { readStoredLanguage } from '../i18n/language-store';

import { openRepositories } from './repositories';
import { openTestDatabase } from './test/open-test-database';

const day: DayRow = {
  localDate: '2026-10-06',
  status: 'open',
  openedAt: '2026-10-06T09:00:00.000Z',
  morningLine: null,
  energy: 'medium',
};

const task: TaskRow = {
  id: 'task-1',
  localDate: '2026-10-06',
  text: 'Call the plumber',
  originalText: 'Call the plumber about the leak under the sink',
  source: 'ramble',
  screen: 'pass',
  seriousOverridden: false,
  status: 'started',
  carriedOver: true,
  firstMentionedOn: '2026-10-01',
  dueDate: '2026-10-09',
  workMode: 'calling',
  fitsTenMinutes: true,
  sharePrivate: false,
  shrinkCount: 1,
  lines: {
    hatch: 'It hatched.',
    start: 'Off we go.',
    working: ['One.', 'Two.', 'Three.'],
    pickedUp: 'Oh, hello.',
    checkIn: 'How is it going?',
    tinyNextStep: 'Find the number.',
    twoMinutesLeft: 'Two minutes.',
    timeUp: 'Time.',
    caught: 'Caught.',
    notFinished: 'You started.',
  },
  notifications: [{ text: 'One small start?' }],
  createdAt: '2026-10-06T09:01:00.000Z',
  bitesCaught: null,
  softUntil: null,
  finishedAt: null,
};

const monster: MonsterRow = {
  id: 'monster-1',
  taskId: 'task-1',
  origin: 'task',
  // The server's signature for the words, which must come back exactly as it was stored.
  signed: { seed: 'task-1', language: 'en', signature: 'signed-by-the-server' },
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
  name: 'Drip Van Winkle, Tenant of the U-Bend',
  title: 'Sink lurker',
  flavourText: 'Collects washers.',
  hatchedAt: '2026-10-06T09:01:05.000Z',
  caughtAt: null,
  caughtOn: null,
  number: null,
  rarity: null,
  daysLurked: null,
  catchMinutes: null,
  dread: null,
  finish: 'paper',
};

const session: SessionRow = {
  id: 'session-1',
  taskId: 'task-1',
  localDate: '2026-10-06',
  plannedMinutes: 25,
  treat: 'a coffee',
  startedAt: '2026-10-06T09:05:00.000Z',
  endsAt: '2026-10-06T09:30:00.000Z',
  endedAt: null,
  outcome: null,
  finishMethod: null,
  notFinishedChoice: null,
  tableId: null,
};

const thought: ParkedThoughtRow = {
  id: 'thought-1',
  sessionId: 'session-1',
  text: 'Buy washers',
  parkedAt: '2026-10-06T09:10:00.000Z',
  resolution: null,
};

const drawerItem: DrawerItemRow = {
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

const worldPiece: WorldPieceRow = {
  id: 'piece-1',
  kind: 'monster',
  monsterId: 'monster-1',
  x: 0.25,
  y: 0.75,
  seed: 'task-1',
  addedOn: '2026-10-06',
};

const recordBar: RecordBarRow = {
  localDate: '2026-10-06',
  week: '2026-W41',
  position: 2,
  instrument: 'bassline',
  seed: 'task-1',
  monsterId: 'monster-1',
};

const weekRecord: WeekRecordRow = {
  week: '2026-W41',
  name: 'Songs for a sink',
  linerNote: null,
  sentence: null,
};

describe('local storage', () => {
  it('creates every table of the contract on an empty database', async () => {
    const { tableNames } = await openTestDatabase();
    expect(tableNames()).toEqual(expect.arrayContaining([...LOCAL_TABLES]));
  });

  it('reads back each row exactly as written, valid against the contract', async () => {
    const repositories = openRepositories((await openTestDatabase()).db);
    await repositories.days.put(day);
    await repositories.tasks.put(task);
    await repositories.monsters.put(monster);
    await repositories.sessions.put(session);
    await repositories.parkedThoughts.put(thought);
    await repositories.drawerItems.put(drawerItem);
    await repositories.worldPieces.put(worldPiece);
    await repositories.recordBars.put(recordBar);
    await repositories.weekRecords.put(weekRecord);

    const stored = [
      [dayRowSchema, await repositories.days.get(day.localDate), day],
      [taskRowSchema, await repositories.tasks.get(task.id), task],
      [monsterRowSchema, await repositories.monsters.get(monster.id), monster],
      [sessionRowSchema, await repositories.sessions.get(session.id), session],
      [parkedThoughtRowSchema, await repositories.parkedThoughts.get(thought.id), thought],
      [drawerItemRowSchema, await repositories.drawerItems.get(drawerItem.id), drawerItem],
      [worldPieceRowSchema, await repositories.worldPieces.get(worldPiece.id), worldPiece],
      [recordBarRowSchema, await repositories.recordBars.get(recordBar.localDate), recordBar],
      [weekRecordRowSchema, await repositories.weekRecords.get(weekRecord.week), weekRecord],
    ] as const;
    for (const [schema, read, written] of stored) {
      expect(read).toEqual(written);
      expect(schema.safeParse(read).success).toBe(true);
    }
    expect(await repositories.sessions.where('taskId', task.id)).toEqual([session]);
  });

  it('refuses a row the contract does not allow, and replaces a row with the same key', async () => {
    const repositories = openRepositories((await openTestDatabase()).db);
    await expect(repositories.tasks.put({ ...task, text: '' })).rejects.toThrow();
    expect(await repositories.tasks.all()).toEqual([]);

    await repositories.tasks.put(task);
    await repositories.tasks.put({ ...task, shrinkCount: 2 });
    expect((await repositories.tasks.all()).map((row) => row.shrinkCount)).toEqual([2]);
  });

  it('keeps settings beside the stored interface language, with defaults for the rest', async () => {
    const { db } = await openTestDatabase();
    const { settings } = openRepositories(db);

    const fresh = await settings.read('vi');
    expect(settingsRowSchema.safeParse(fresh).success).toBe(true);
    expect(fresh).toMatchObject({ language: 'vi', attitude: 'cheeky', keepTranscripts: false });

    await settings.write({
      attitude: 'soft',
      keepTranscripts: true,
      haptics: false,
      language: 'en',
    });
    expect(await settings.read('vi')).toMatchObject({
      language: 'en',
      attitude: 'soft',
      keepTranscripts: true,
      haptics: false,
      effects: true,
    });
    // The language picker reads the same key.
    expect(
      await readStoredLanguage({
        getFirstAsync: async <T>(source: string, params: string[]) =>
          ((await db.getAllAsync<T>(source, params))[0] ?? null) as T | null,
        runAsync: (source, params) => db.runAsync(source, params),
      }),
    ).toBe('en');
  });

  it('leaves no row in any table when a task is let go', async () => {
    const database = await openTestDatabase();
    const repositories = openRepositories(database.db);
    await repositories.tasks.put(task);
    await repositories.monsters.put(monster);
    await repositories.sessions.put(session);
    await repositories.sessions.put({ ...session, id: 'session-0', endedAt: session.startedAt });
    await repositories.parkedThoughts.put(thought);

    await repositories.forgetTask(task.id);

    for (const table of database.tableNames())
      expect([table, database.count(table)]).toEqual([table, 0]);
  });

  it('deletes a transcript at the pick, or seven days on when the person keeps transcripts', async () => {
    const database = await openTestDatabase();
    const { transcripts } = openRepositories(database.db);
    const made = Date.parse('2026-10-06T09:00:00.000Z');

    await transcripts.save('ramble-1', 'so many things', made);
    expect((await transcripts.pending())?.text).toBe('so many things');
    await transcripts.picked('ramble-1', false, made + 1000);
    expect(await transcripts.all()).toEqual([]);

    await transcripts.save('ramble-2', 'so many other things', made);
    await transcripts.picked('ramble-2', true, made + 1000);
    expect(await transcripts.pending()).toBeNull();
    await transcripts.purgeOld(made + 7 * DAY_MS - 1);
    expect((await transcripts.all()).map((one) => one.id)).toEqual(['ramble-2']);
    await transcripts.purgeOld(made + 7 * DAY_MS);
    expect(database.count('ramble_transcripts')).toBe(0);
  });
});
