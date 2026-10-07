import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../../../data/repositories';
import { openTestDatabase } from '../../../data/test/open-test-database';
import { createBackupTokens } from '../../backup/backup-token';
import {
  CRISIS_DATE,
  CRISIS_DAY_LINE,
  CRISIS_DAY_TASK_TEXT,
  drawerItem,
  fillWorld,
  memoryStore,
  monster,
  task,
  TOKEN,
} from '../../backup/test/sample-world';

import { memoryKeptShares, type KeptShare } from '../../share/kept-shares';

import { deleteEverything, retryServerDelete } from './delete-everything';
import { buildExport, exportMyData } from './export-data';

const NOW = Date.parse('2026-10-06T10:00:00.000Z');
const SENTENCE = 'and then the heron stole my sandwich again';

async function phone() {
  const data = await openTestDatabase();
  const repositories = openRepositories(data.db);
  await fillWorld(repositories);
  await repositories.transcripts.save('ramble-1', SENTENCE, NOW);
  const keychain = memoryStore(TOKEN);
  const cloud = memoryStore(TOKEN);
  const tokens = createBackupTokens({ keychain, cloud, newToken: () => TOKEN });
  const server = {
    online: true,
    calls: [] as (string | null)[],
    deleteData: (backupToken: string | null) => {
      if (!server.online) return Promise.reject(new Error('offline'));
      server.calls.push(backupToken);
      return Promise.resolve();
    },
  };
  return { data, repositories, keychain, cloud, tokens, server };
}

describe('delete everything', () => {
  it('empties every local table, asks the server once and clears both token stores', async () => {
    const { data, keychain, cloud, tokens, server } = await phone();
    expect(data.tableNames().filter((table) => data.count(table) > 0).length).toBeGreaterThan(10);

    expect(await deleteEverything({ db: data.db, tokens, server })).toBe('deleted');

    expect(data.tableNames().map((table) => [table, data.count(table)])).toEqual(
      data.tableNames().map((table) => [table, 0]),
    );
    expect(server.calls).toEqual([TOKEN]);
    expect(keychain.value).toBeNull();
    expect(cloud.value).toBeNull();
    expect(await retryServerDelete({ db: data.db, tokens, server })).toBe('nothing_pending');
    expect(server.calls).toHaveLength(1);
  });

  it('takes down the pages this phone shared, forgets them, and cancels the charge reminders', async () => {
    const { data, tokens, server } = await phone();
    const kept = memoryKeptShares([
      { key: 'card:a:1', id: 'page-1', unshareToken: 'u1', language: 'en', taskShown: true },
      { key: 'monster:b', id: 'page-2', unshareToken: 'u2', language: 'en', taskShown: false },
    ]);
    const done: string[] = [];
    const leftovers = {
      kept,
      // The second page cannot be reached: the delete goes on, and nothing of it stays here.
      unshare: (share: KeptShare) => {
        done.push(`unshare ${share.id}`);
        return share.id === 'page-2' ? Promise.reject(new Error('offline')) : Promise.resolve();
      },
      cancelChargeReminders: () => Promise.resolve(void done.push('reminders cancelled')),
    };

    expect(await deleteEverything({ db: data.db, tokens, server, leftovers })).toBe('deleted');
    expect(done).toEqual(['unshare page-1', 'unshare page-2', 'reminders cancelled']);
    expect(await kept.read()).toEqual([]);
  });

  it('still empties the phone when the server cannot be reached, and finishes on a retry', async () => {
    const { data, repositories, keychain, cloud, tokens, server } = await phone();
    server.online = false;

    expect(await deleteEverything({ db: data.db, tokens, server })).toBe('pending');

    expect(await repositories.tasks.all()).toEqual([]);
    expect(data.dump()).not.toContain(SENTENCE);
    // The marker is the only row left anywhere, and the token is kept to name the snapshot.
    expect(data.dump()).toBe(
      JSON.stringify(
        data
          .tableNames()
          .map((table) =>
            table === 'settings' ? [{ key: 'serverDeletePending', value: '1' }] : [],
          ),
      ),
    );
    expect(keychain.value).toBe(TOKEN);
    expect(await retryServerDelete({ db: data.db, tokens, server })).toBe('pending');

    server.online = true;
    expect(await retryServerDelete({ db: data.db, tokens, server })).toBe('deleted');
    expect(server.calls).toEqual([TOKEN]);
    expect(data.count('settings')).toBe(0);
    expect(keychain.value).toBeNull();
    expect(cloud.value).toBeNull();
  });
});

describe('export my data', () => {
  it('holds the tasks, cards, records, world, drawer and settings', async () => {
    const { repositories } = await phone();
    const exported = await buildExport(repositories, NOW);
    expect(exported.tasks).toEqual([task]);
    expect(exported.monsters).toEqual([monster]);
    expect(exported.drawerItems).toEqual([drawerItem]);
    expect(exported.records.bars).toHaveLength(1);
    expect(exported.records.weeks).toHaveLength(1);
    expect(exported.worldPieces).toHaveLength(1);
    expect(exported.settings).toMatchObject({ attitude: 'unhinged', music: false });
  });

  it('holds no transcript, and nothing but the date of a crisis day', async () => {
    const { repositories } = await phone();
    const exported = await buildExport(repositories, NOW);
    const text = JSON.stringify(exported);
    expect(text).not.toContain(SENTENCE);
    expect(text).not.toContain(CRISIS_DAY_TASK_TEXT);
    expect(text).not.toContain(CRISIS_DAY_LINE);
    expect(exported.days).toContainEqual({ localDate: CRISIS_DATE, status: 'crisis' });
    // The date appears once, on the day itself.
    expect(text.split(CRISIS_DATE)).toHaveLength(2);
  });

  it('writes one json file and opens the share sheet on it', async () => {
    const { repositories } = await phone();
    const written: { name: string; text: string }[] = [];
    const shared: [string, string][] = [];
    await exportMyData({
      repositories,
      clock: { now: () => NOW },
      device: {
        writeFile: (name, bytes) => {
          written.push({ name, text: new TextDecoder().decode(bytes) });
          return Promise.resolve(`file:///cache/${name}`);
        },
        openShareSheet: (uri, mimeType) => {
          shared.push([uri, mimeType]);
          return Promise.resolve();
        },
      },
    });
    expect(written.map((file) => file.name)).toEqual(['scootch-data-2026-10-06.json']);
    expect(JSON.parse(written[0]?.text ?? '')).toEqual(
      JSON.parse(JSON.stringify(await buildExport(repositories, NOW))),
    );
    expect(shared).toEqual([['file:///cache/scootch-data-2026-10-06.json', 'application/json']]);
  });
});
