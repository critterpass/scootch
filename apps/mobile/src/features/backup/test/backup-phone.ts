import { openRepositories } from '../../../data/repositories';
import { openTestDatabase, type TestDatabase } from '../../../data/test/open-test-database';
import { createBackup } from '../backup';
import type { BackupApi } from '../backup-api';
import { createBackupTokens } from '../backup-token';

import { fillWorld, memoryStore, TOKEN } from './sample-world';

export const NOW = Date.parse('2026-10-06T10:00:00.000Z');

/** The server at the network boundary: what it holds, and what it was asked. */
export function fakeServer(stored: unknown = null) {
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

export async function phone(
  options: {
    token?: string | null;
    stored?: unknown;
    world?: boolean;
    database?: TestDatabase;
  } = {},
) {
  const data = options.database ?? (await openTestDatabase());
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
