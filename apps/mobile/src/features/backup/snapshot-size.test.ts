import { describe, expect, it } from '@jest/globals';

import type { SessionLinePack } from '@scootch/domain';

import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import { openRepositories, type Repositories } from '../../data/repositories';
import { openTestDatabase } from '../../data/test/open-test-database';

import { createBackup } from './backup';
import type { BackupApi } from './backup-api';
import { createBackupTokens } from './backup-token';
import { buildSnapshot, isRestorableSnapshot, type Snapshot } from './snapshot';
import { BACKUP_MAX_BYTES, fitSnapshot, snapshotBytes } from './snapshot-size';
import {
  fillWorld,
  memoryStore,
  monster,
  session,
  task,
  thought,
  TOKEN,
} from './test/sample-world';

const NOW = Date.parse('2026-10-06T10:00:00.000Z');
const lines = passFixture.response.lines as SessionLinePack;
const stamp = (index: number) =>
  new Date(Date.parse('2025-01-01T09:00:00.000Z') + index * 86_400_000).toISOString();

/** A long-lived phone: the sample world, and one more finished sitting a day for `count` days. */
async function longLived(
  count: number,
  each: (repositories: Repositories, index: number) => Promise<void> = () => Promise.resolve(),
) {
  const data = await openTestDatabase();
  const repositories = openRepositories(data.db);
  await fillWorld(repositories);
  await repositories.transaction(async () => {
    for (let index = 0; index < count; index += 1) {
      const id = String(index).padStart(4, '0');
      await repositories.tasks.put({ ...task, id: `old-task-${id}`, lines });
      await repositories.sessions.put({
        ...session,
        id: `old-session-${id}`,
        taskId: `old-task-${id}`,
        startedAt: stamp(index),
      });
      await repositories.parkedThoughts.put({
        ...thought,
        id: `old-thought-${id}`,
        sessionId: `old-session-${id}`,
      });
      await each(repositories, index);
    }
  });
  return { data, repositories };
}

function backupOf(repositories: Repositories, db: Parameters<typeof createBackup>[0]['db']) {
  const sent: Snapshot[] = [];
  const api: BackupApi = {
    put: (_token, snapshot) => {
      sent.push(JSON.parse(JSON.stringify(snapshot)) as Snapshot);
      return Promise.resolve();
    },
    get: () => Promise.resolve(null),
    remove: () => Promise.resolve(),
  };
  const tokens = createBackupTokens({
    keychain: memoryStore(TOKEN),
    cloud: memoryStore(TOKEN),
    newToken: () => TOKEN,
  });
  const backup = createBackup({ tokens, api, repositories, db, clock: { now: () => NOW } });
  return { backup, sent };
}

// Hundreds of rows go through a real database: slow on a loaded machine.
const SLOW = 60_000;

describe('a snapshot larger than the server keeps', () => {
  it(
    'goes up whole while it fits',
    async () => {
      const { repositories, data } = await longLived(3);
      const whole = await buildSnapshot(repositories, NOW);
      expect(fitSnapshot(whole)).toBe(whole);
      const { backup, sent } = backupOf(repositories, data.db);
      await backup.afterFinish();
      expect(sent).toHaveLength(1);
      expect(sent[0]?.sessions).toHaveLength(4);
      expect(await backup.tooLarge()).toBe(false);
    },
    SLOW,
  );

  it(
    "drops the oldest finished sessions' detail first, and nothing that is kept for good",
    async () => {
      const { repositories, data } = await longLived(300);
      const whole = await buildSnapshot(repositories, NOW);
      expect(snapshotBytes(whole)).toBeGreaterThan(BACKUP_MAX_BYTES);

      const { backup, sent } = backupOf(repositories, data.db);
      await backup.afterFinish();
      const [fitted] = sent;
      if (!fitted) throw new Error('nothing was uploaded');
      expect(snapshotBytes(fitted)).toBeLessThanOrEqual(BACKUP_MAX_BYTES);
      expect(isRestorableSnapshot(fitted)).toBe(true);
      expect(await backup.tooLarge()).toBe(false);

      // The sittings that went are the oldest ones, with no gap; the newest are all still there.
      const kept = new Set(fitted.sessions.map((one) => one.id));
      const order = [...whole.sessions].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
      const dropped = order.filter((one) => !kept.has(one.id));
      expect(dropped.length).toBeGreaterThan(0);
      expect(dropped.length).toBeLessThan(order.length);
      expect(dropped).toEqual(order.slice(0, dropped.length));
      expect(kept.has(session.id)).toBe(true);
      for (const one of dropped) {
        expect(fitted.parkedThoughts.some((parked) => parked.sessionId === one.id)).toBe(false);
        expect(fitted.tasks.find((row) => row.id === one.taskId)).toMatchObject({
          text: task.text,
          status: 'finished',
          lines: null,
        });
      }
      // Every task is still there, and so is everything a person keeps.
      expect(fitted.tasks.map((row) => row.id)).toEqual(whole.tasks.map((row) => row.id));
      for (const table of [
        'monsters',
        'worldPieces',
        'recordBars',
        'weekRecords',
        'surpriseDrops',
        'drawerItems',
        'days',
        'settings',
      ] as const) {
        expect([table, fitted[table]]).toEqual([table, JSON.parse(JSON.stringify(whole[table]))]);
      }
    },
    SLOW,
  );

  it(
    'is not uploaded when it is still too large, and says so until one goes up',
    async () => {
      // What is kept for good is, by itself, more than the server takes.
      const { repositories, data } = await longLived(1200, async (rows, index) => {
        await rows.monsters.put({
          ...monster,
          id: `old-monster-${index}`,
          taskId: `old-task-${String(index).padStart(4, '0')}`,
          flavourText: 'x'.repeat(160),
        });
      });
      const whole = await buildSnapshot(repositories, NOW);
      expect(fitSnapshot(whole)).toBeNull();

      const { backup, sent } = backupOf(repositories, data.db);
      await backup.afterFinish();
      expect(sent).toEqual([]);
      expect(await backup.tooLarge()).toBe(true);
      // Nothing on the phone was touched to make room.
      expect(data.count('sessions')).toBe(1201);
      expect(data.count('monsters')).toBe(1201);

      // Once a snapshot fits again the line goes.
      for (const one of await repositories.tasks.all()) {
        if (one.id.startsWith('old-task-')) await repositories.forgetTask(one.id);
      }
      await backup.afterFinish();
      expect(sent).toHaveLength(1);
      expect(await backup.tooLarge()).toBe(false);
    },
    SLOW,
  );
});
