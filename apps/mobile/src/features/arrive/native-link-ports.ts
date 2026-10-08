import type { SQLiteDatabase } from 'expo-sqlite';

import type { HttpClient } from '../../api/http-client';
import { createMonsterPageApi } from '../../api/monster-page-api';
import { openRepositories } from '../../data/repositories';
import { arrivedPagesStore } from '../../state/arrived-pages';
import type { Backup } from '../backup/backup';
import { keychainKeptShares } from '../share/native-kept-shares';

import type { LinkPorts } from './open-link';

// The real phone behind a monster's link. Nothing here is covered by the unit tests, which use a
// test database and lists in memory: it runs only in a native build.

/** What opening a monster's link needs, beyond the day store, the App Group and the clock. */
export function nativeLinkPorts(from: {
  readonly db: SQLiteDatabase;
  readonly http: HttpClient;
  readonly backup: Pick<Backup, 'findRestore'>;
}): Omit<LinkPorts, 'store' | 'shared' | 'now'> {
  const api = createMonsterPageApi(from.http);
  return {
    read: (id) => api.read(id),
    kept: keychainKeptShares,
    holders: {
      repositories: openRepositories(from.db),
      arrivedPages: arrivedPagesStore(from.db),
    },
    // Once the offer has been answered this asks the server nothing.
    restoreWaits: async () => (await from.backup.findRestore()) !== null,
  };
}
