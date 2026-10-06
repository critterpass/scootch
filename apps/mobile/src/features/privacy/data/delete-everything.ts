import type { SqlDatabase } from '../../../data/table';
import type { DataDeleteApi } from '../../backup/backup-api';
import type { BackupTokens } from '../../backup/backup-token';
import { SERVER_DELETE_PENDING_KEY, settingsValues } from '../../backup/settings-values';

export interface DeleteEverythingDeps {
  readonly db: SqlDatabase;
  readonly tokens: BackupTokens;
  readonly server: DataDeleteApi;
}

/** `pending`: the phone is empty, but the server has not been reached yet. */
export type ServerDelete = 'deleted' | 'pending';

/** The migration log stays, so the app does not try to create its tables a second time. */
const MIGRATION_LOG = '_migrations';

/**
 * Asks the server to delete, then forgets the backup token. While the server cannot be reached
 * the token is kept, because it is the only way to name the snapshot that still has to go.
 */
async function finishOnServer(deps: DeleteEverythingDeps): Promise<ServerDelete> {
  try {
    const { token } = await deps.tokens.read();
    await deps.server.deleteData(token);
  } catch {
    return 'pending';
  }
  await settingsValues(deps.db).remove(SERVER_DELETE_PENDING_KEY);
  await deps.tokens.clear();
  return 'deleted';
}

/**
 * "Delete everything": empties every table on the phone, then the server, then both token stores.
 *
 * The tables are read from the database itself, so one added by a newer migration is emptied
 * without this file changing. The marker is written in the same transaction as the erase, so if
 * the app is closed before the server answers, `retryServerDelete` still finishes the job.
 *
 * The device token is left alone: the server stops honouring it, and the HTTP client registers
 * the phone again the next time it is needed.
 */
export async function deleteEverything(deps: DeleteEverythingDeps): Promise<ServerDelete> {
  const tables = await deps.db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> ?",
    [MIGRATION_LOG],
  );
  await deps.db.withTransactionAsync(async () => {
    for (const { name } of tables) {
      await deps.db.runAsync(`DELETE FROM "${name.replaceAll('"', '""')}"`, []);
    }
    await settingsValues(deps.db).set(SERVER_DELETE_PENDING_KEY, '1');
  });
  return finishOnServer(deps);
}

/**
 * Run at app start. When an earlier "delete everything" did not reach the server, tries again;
 * on success the marker and the tokens are cleared. Does nothing when no delete is waiting.
 */
export async function retryServerDelete(
  deps: DeleteEverythingDeps,
): Promise<ServerDelete | 'nothing_pending'> {
  const marker = await settingsValues(deps.db).get(SERVER_DELETE_PENDING_KEY);
  return marker === null ? 'nothing_pending' : finishOnServer(deps);
}
