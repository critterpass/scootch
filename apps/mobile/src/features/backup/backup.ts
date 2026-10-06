import { HOUR_MS, instantFromIso, isoFromInstant, type Instant } from '@scootch/domain';

import type { Repositories } from '../../data/repositories';
import type { SqlDatabase } from '../../data/table';

import type { BackupApi } from './backup-api';
import type { BackupTokens } from './backup-token';
import {
  BACKUP_TOO_LARGE_KEY,
  LAST_BACKUP_KEY,
  SERVER_DELETE_PENDING_KEY,
  settingsValues,
} from './settings-values';
import { fitSnapshot } from './snapshot-size';
import {
  buildSnapshot,
  isFreshDatabase,
  isRestorableSnapshot,
  restoreSnapshot,
  type Snapshot,
} from './snapshot';

export interface BackupDeps {
  readonly tokens: BackupTokens;
  readonly api: BackupApi;
  readonly repositories: Repositories;
  /** The same database the repositories are opened on: the last upload's time is kept in it. */
  readonly db: SqlDatabase;
  readonly clock: { now(): Instant };
}

export interface Backup {
  /** A thing was finished: upload a snapshot now. */
  afterFinish(): Promise<void>;
  /** Upload a snapshot unless one got through within the last hour. */
  maybeUpload(): Promise<void>;
  /**
   * On a phone with nothing made yet and a token already in a store: the snapshot the server
   * holds, or `null`. It never makes a token, so a first-ever launch asks the server nothing.
   */
  findRestore(): Promise<Snapshot | null>;
  restore(snapshot: Snapshot): Promise<'restored' | 'refused'>;
  /** True when neither token store can be read: the world lives only on this phone. */
  bothStoresOff(): Promise<boolean>;
  /** True while the last snapshot was too large for the server to keep, so none went up. */
  tooLarge(): Promise<boolean>;
}

/** Between finishes a snapshot goes up at most this often. */
export const UPLOAD_EVERY_MS = HOUR_MS;

export function createBackup(deps: BackupDeps): Backup {
  const values = settingsValues(deps.db);
  // Kept in memory while the app runs, and in the settings table so a relaunch does not forget it.
  let lastUpload: Instant | null = null;

  const deletePending = async () => (await values.get(SERVER_DELETE_PENDING_KEY)) !== null;

  async function lastUploadAt(): Promise<Instant | null> {
    if (lastUpload !== null) return lastUpload;
    const stored = await values.get(LAST_BACKUP_KEY);
    const instant = stored === null ? Number.NaN : instantFromIso(stored);
    return Number.isFinite(instant) ? instant : null;
  }

  /**
   * A failed upload is silent: nothing is recorded, so the next finish or the next hourly check
   * tries again. Two things are never uploaded. An empty phone, because that would replace the
   * snapshot it may be about to restore. And anything while "delete everything" is still waiting
   * to reach the server, because that would put back what the person asked to be removed.
   *
   * A snapshot over the server's cap first loses the detail of its oldest finished sessions. One
   * that is still too large is not sent at all, and that is remembered so the person can be told.
   */
  async function upload(): Promise<void> {
    try {
      if ((await isFreshDatabase(deps.repositories)) || (await deletePending())) return;
      const token = await deps.tokens.ensure();
      if (token === null) return;
      const now = deps.clock.now();
      const snapshot = fitSnapshot(await buildSnapshot(deps.repositories, now));
      if (snapshot === null) {
        await values.set(BACKUP_TOO_LARGE_KEY, '1');
        return;
      }
      await deps.api.put(token, snapshot);
      lastUpload = now;
      await values.set(LAST_BACKUP_KEY, isoFromInstant(now));
      await values.remove(BACKUP_TOO_LARGE_KEY);
    } catch {
      // Offline, a server fault or a store that would not answer: try again next time.
    }
  }

  return {
    afterFinish: upload,
    async maybeUpload() {
      const last = await lastUploadAt().catch(() => null);
      if (last !== null && deps.clock.now() - last < UPLOAD_EVERY_MS) return;
      await upload();
    },
    async findRestore() {
      try {
        if (!(await isFreshDatabase(deps.repositories)) || (await deletePending())) return null;
        const { token } = await deps.tokens.read();
        if (token === null) return null;
        const snapshot = await deps.api.get(token);
        return isRestorableSnapshot(snapshot) ? snapshot : null;
      } catch {
        return null;
      }
    },
    restore: (snapshot) => restoreSnapshot(deps.repositories, snapshot),
    bothStoresOff: () => deps.tokens.bothOff(),
    tooLarge: async () => (await values.get(BACKUP_TOO_LARGE_KEY)) !== null,
  };
}
