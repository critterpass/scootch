import type { SqlDatabase } from '../../../data/table';
import type { DataDeleteApi } from '../../backup/backup-api';
import type { BackupTokens } from '../../backup/backup-token';
import { SERVER_DELETE_PENDING_KEY, settingsValues } from '../../backup/settings-values';
import type { KeptShare, KeptShares } from '../../share/kept-shares';

/** What lives outside the database and the backup, and still belongs to the person. */
export interface Leftovers {
  /** The pages this phone shared, with the tokens that take them down. */
  readonly kept: KeptShares;
  readonly unshare: (share: KeptShare) => Promise<void>;
  readonly cancelChargeReminders: () => Promise<void>;
  /** How long all the takedowns together may hold the delete up. */
  readonly capMs?: number;
}

export interface DeleteEverythingDeps {
  readonly db: SqlDatabase;
  readonly tokens: BackupTokens;
  readonly server: DataDeleteApi;
  readonly leftovers?: Leftovers;
}

/** The keys of the shared pages a "delete everything" still has to take down, as a JSON list. */
const TAKEDOWNS_PENDING_KEY = 'takedownsPending';
const TAKEDOWN_CAP_MS = 8000;

async function pendingTakedowns(db: SqlDatabase): Promise<string[]> {
  const stored = await settingsValues(db).get(TAKEDOWNS_PENDING_KEY);
  try {
    const keys: unknown = JSON.parse(stored ?? '[]');
    return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Takes down the shared pages a delete named, all at once and under one cap, so a page that does
 * not answer holds nothing up. A page is forgotten only once it is down: the ones that failed, or
 * had not answered by the cap, stay in the list with their tokens and are tried again when the
 * app next starts. The server's delete does not remove shared pages, so this is the only way they
 * come down. Pages shared after the delete are not named, and are left alone.
 */
async function takeDownShared(deps: DeleteEverythingDeps): Promise<void> {
  const { leftovers, db } = deps;
  if (!leftovers) return;
  const pending = new Set(await pendingTakedowns(db));
  if (pending.size === 0) return;
  const shares = await leftovers.kept.read();
  const down = new Set<string>();
  const attempts = shares
    .filter((share) => pending.has(share.key))
    .map((share) =>
      leftovers.unshare(share).then(
        () => void down.add(share.key),
        () => undefined,
      ),
    );
  const cap = new Promise<void>((over) => setTimeout(over, leftovers.capMs ?? TAKEDOWN_CAP_MS));
  await Promise.race([Promise.all(attempts), cap]);
  // The list is read again: anything shared meanwhile stays in it.
  const now = await leftovers.kept.read();
  await leftovers.kept.write(now.filter((share) => !down.has(share.key)));
  const left = now.filter((share) => pending.has(share.key) && !down.has(share.key));
  const values = settingsValues(db);
  if (left.length === 0) await values.remove(TAKEDOWNS_PENDING_KEY);
  else await values.set(TAKEDOWNS_PENDING_KEY, JSON.stringify(left.map((share) => share.key)));
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
 * "Delete everything": empties every table on the phone, then what lives outside it (shared
 * pages, charge reminders), then the server, then both token stores.
 *
 * The tables are read from the database itself, so one added by a newer migration is emptied
 * without this file changing. The marker is written in the same transaction as the erase, so if
 * the app is closed before the server answers, `retryServerDelete` still finishes the job.
 *
 * The device token is left alone: the server stops honouring it, and the HTTP client registers
 * the phone again the next time it is needed.
 */
export async function deleteEverything(deps: DeleteEverythingDeps): Promise<ServerDelete> {
  const shared = (await deps.leftovers?.kept.read().catch(() => [])) ?? [];
  const tables = await deps.db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> ?",
    [MIGRATION_LOG],
  );
  await deps.db.withTransactionAsync(async () => {
    for (const { name } of tables) {
      await deps.db.runAsync(`DELETE FROM "${name.replaceAll('"', '""')}"`, []);
    }
    await settingsValues(deps.db).set(SERVER_DELETE_PENDING_KEY, '1');
    if (shared.length > 0) {
      const keys = JSON.stringify(shared.map((share) => share.key));
      await settingsValues(deps.db).set(TAKEDOWNS_PENDING_KEY, keys);
    }
  });
  await takeDownShared(deps).catch(() => undefined);
  // Reminders already scheduled go; while a subscription is active the store plans them afresh.
  await deps.leftovers?.cancelChargeReminders().catch(() => undefined);
  return finishOnServer(deps);
}

/**
 * Run at app start. Shared pages an earlier "delete everything" could not take down are tried
 * again. When that delete did not reach the server either, that is tried again too;
 * on success the marker and the tokens are cleared. Does nothing when no delete is waiting.
 */
export async function retryServerDelete(
  deps: DeleteEverythingDeps,
): Promise<ServerDelete | 'nothing_pending'> {
  await takeDownShared(deps).catch(() => undefined);
  const marker = await settingsValues(deps.db).get(SERVER_DELETE_PENDING_KEY);
  return marker === null ? 'nothing_pending' : finishOnServer(deps);
}
