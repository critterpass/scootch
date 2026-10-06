import { describe, expect, it } from '@jest/globals';

import { HOUR_MS, MINUTE_MS } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { openTestDatabase } from '../../data/test/open-test-database';

import { createBackup } from './backup';
import type { BackupApi } from './backup-api';
import { createBackupTokens } from './backup-token';
import { SERVER_DELETE_PENDING_KEY, settingsValues } from './settings-values';
import { buildSnapshot, restoreSnapshot } from './snapshot';
import {
  CRISIS_DATE,
  CRISIS_DAY_LINE,
  crisisDayTask,
  day,
  fillWorld,
  memoryStore,
  monster,
  TOKEN,
} from './test/sample-world';

const NOW = Date.parse('2026-10-06T10:00:00.000Z');

/** The server at the network boundary: what it holds, and what it was asked. */
function fakeServer(stored: unknown = null) {
  const server = {
    online: true,
    stored,
    puts: [] as string[],
    gets: [] as string[],
  };
  const api: BackupApi = {
    put: (token, snapshot) => {
      if (!server.online) return Promise.reject(new Error('offline'));
      server.puts.push(token);
      // What travels is JSON, so what comes back is what JSON keeps.
      server.stored = JSON.parse(JSON.stringify(snapshot));
      return Promise.resolve();
    },
    get: (token) => {
      if (!server.online) return Promise.reject(new Error('offline'));
      server.gets.push(token);
      return Promise.resolve(server.stored);
    },
    remove: () => {
      server.stored = null;
      return Promise.resolve();
    },
  };
  return Object.assign(server, { api });
}

async function phone(options: { token?: string | null; stored?: unknown; world?: boolean } = {}) {
  const data = await openTestDatabase();
  const repositories = openRepositories(data.db);
  if (options.world ?? true) await fillWorld(repositories);
  const keychain = memoryStore(options.token ?? null);
  const cloud = memoryStore(options.token ?? null);
  let made = 0;
  const tokens = createBackupTokens({
    keychain,
    cloud,
    newToken: () => {
      made += 1;
      return TOKEN;
    },
  });
  const server = fakeServer(options.stored);
  const time = { now: NOW };
  const open = () =>
    createBackup({
      tokens,
      api: server.api,
      repositories,
      db: data.db,
      clock: { now: () => time.now },
    });
  return { data, repositories, keychain, cloud, server, time, open, made: () => made };
}

describe('a snapshot', () => {
  it('restores the world, the cards and the drawer on an empty database', async () => {
    const old = await phone();
    const snapshot: unknown = JSON.parse(
      JSON.stringify(await buildSnapshot(old.repositories, NOW)),
    );
    const fresh = await phone({ world: false });

    expect(await restoreSnapshot(fresh.repositories, snapshot)).toBe('restored');

    const tables = [
      'tasks',
      'drawerItems',
      'monsters',
      'sessions',
      'parkedThoughts',
      'worldPieces',
      'recordBars',
      'weekRecords',
      'surpriseDrops',
    ] as const;
    for (const table of tables) {
      const restored = await fresh.repositories[table].all();
      expect(restored.length).toBeGreaterThan(0);
      expect(restored).toEqual(await old.repositories[table].all());
    }
    expect(await fresh.repositories.monsters.get(monster.id)).toEqual(monster);
    expect(await fresh.repositories.days.get(day.localDate)).toEqual(day);
    expect(await fresh.repositories.settings.read('en')).toEqual(
      await old.repositories.settings.read('en'),
    );
  });

  it('carries only the date of a crisis day', async () => {
    const old = await phone();
    const snapshot = await buildSnapshot(old.repositories, NOW);
    expect(snapshot.days).toContainEqual({ localDate: CRISIS_DATE, status: 'crisis' });
    expect(JSON.stringify(snapshot)).not.toContain(CRISIS_DAY_LINE);

    const fresh = await phone({ world: false });
    await restoreSnapshot(fresh.repositories, snapshot);
    expect(await fresh.repositories.days.get(CRISIS_DATE)).toMatchObject({
      status: 'crisis',
      morningLine: null,
      energy: null,
    });
  });

  it('contains no ramble', async () => {
    const { repositories, data } = await phone();
    const sentence = 'and then the heron stole my sandwich again';
    await repositories.transcripts.save('ramble-1', sentence, NOW);
    expect(data.dump()).toContain(sentence);

    expect(JSON.stringify(await buildSnapshot(repositories, NOW))).not.toContain(sentence);
  });

  it('leaves a language that still follows the phone unset after a restore', async () => {
    const old = await phone({ world: false });
    await old.repositories.days.put(day);
    const fresh = await phone({ world: false });
    await restoreSnapshot(fresh.repositories, await buildSnapshot(old.repositories, NOW));
    expect((await fresh.repositories.settings.read('vi')).language).toBe('vi');
  });

  it('is refused whole when its version is unknown, it is malformed, or the phone has data', async () => {
    const old = await phone();
    const snapshot = await buildSnapshot(old.repositories, NOW);
    const fresh = await phone({ world: false });

    const newer = { ...snapshot, version: 2 };
    const broken = { ...snapshot, monsters: [{ ...monster, number: 'first' }] };
    expect(await restoreSnapshot(fresh.repositories, newer)).toBe('refused');
    expect(await restoreSnapshot(fresh.repositories, broken)).toBe('refused');
    for (const table of fresh.data.tableNames()) expect(fresh.data.count(table)).toBe(0);

    await fresh.repositories.tasks.put(crisisDayTask);
    expect(await restoreSnapshot(fresh.repositories, snapshot)).toBe('refused');
    expect(await fresh.repositories.monsters.all()).toEqual([]);
  });
});

describe('uploading', () => {
  it('happens after a finish, and otherwise at most once an hour', async () => {
    const { server, time, open } = await phone();
    const backup = open();

    await backup.afterFinish();
    expect(server.puts).toEqual([TOKEN]);

    time.now = NOW + 59 * MINUTE_MS;
    await backup.maybeUpload();
    expect(server.puts).toHaveLength(1);

    time.now = NOW + HOUR_MS;
    await backup.maybeUpload();
    expect(server.puts).toHaveLength(2);

    // A finish does not wait for the hour.
    time.now = NOW + HOUR_MS + MINUTE_MS;
    await backup.afterFinish();
    expect(server.puts).toHaveLength(3);
  });

  it('remembers the last upload across a relaunch', async () => {
    const { server, time, open } = await phone();
    await open().afterFinish();

    time.now = NOW + 30 * MINUTE_MS;
    await open().maybeUpload();
    expect(server.puts).toHaveLength(1);
  });

  it('fails silently and tries again next time', async () => {
    const { server, time, open } = await phone();
    const backup = open();
    server.online = false;
    await expect(backup.afterFinish()).resolves.toBeUndefined();

    server.online = true;
    time.now = NOW + MINUTE_MS;
    await backup.maybeUpload();
    expect(server.puts).toHaveLength(1);
  });

  it('never sends an empty phone, nor anything while a server delete is waiting', async () => {
    const empty = await phone({ world: false, token: TOKEN });
    await empty.open().afterFinish();
    expect(empty.server.puts).toEqual([]);

    const waiting = await phone({ token: TOKEN });
    await settingsValues(waiting.data.db).set(SERVER_DELETE_PENDING_KEY, '1');
    await waiting.open().afterFinish();
    expect(waiting.server.puts).toEqual([]);
  });
});

describe('finding a restore', () => {
  it('returns the server snapshot on a fresh phone that already has a token', async () => {
    const old = await phone({ token: TOKEN });
    await old.open().afterFinish();

    const fresh = await phone({ world: false, token: TOKEN, stored: old.server.stored });
    const backup = fresh.open();
    const found = await backup.findRestore();
    expect(found).toEqual(old.server.stored);
    expect(fresh.server.gets).toEqual([TOKEN]);

    expect(found && (await backup.restore(found))).toBe('restored');
    expect(await fresh.repositories.monsters.all()).toEqual([monster]);
  });

  it('asks nothing and makes no token when there is no token', async () => {
    const fresh = await phone({ world: false, stored: { version: 1 } });
    expect(await fresh.open().findRestore()).toBeNull();
    expect(fresh.server.gets).toEqual([]);
    expect(fresh.made()).toBe(0);
    expect(fresh.keychain.value).toBeNull();
    expect(fresh.cloud.value).toBeNull();
  });

  it('returns null on a phone that already has data', async () => {
    const used = await phone({ token: TOKEN, stored: { version: 1 } });
    expect(await used.open().findRestore()).toBeNull();
    expect(used.server.gets).toEqual([]);
  });

  it('returns null when the server has none, or cannot be reached', async () => {
    const fresh = await phone({ world: false, token: TOKEN, stored: null });
    expect(await fresh.open().findRestore()).toBeNull();
    fresh.server.online = false;
    expect(await fresh.open().findRestore()).toBeNull();
  });

  it('reports when both token stores are off', async () => {
    const { keychain, cloud, open } = await phone();
    expect(await open().bothStoresOff()).toBe(false);
    keychain.off = true;
    cloud.off = true;
    expect(await open().bothStoresOff()).toBe(true);
  });
});
