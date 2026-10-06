import type { HttpClient } from '../../api/http-client';

import type { Snapshot } from './snapshot';

/** The server's side of backup, at the network boundary. Each call needs the backup token. */
export interface BackupApi {
  put(token: string, snapshot: Snapshot): Promise<void>;
  /** The snapshot stored under the token, exactly as it was sent, or `null` when there is none. */
  get(token: string): Promise<unknown>;
  remove(token: string): Promise<void>;
}

/** "Delete everything" on the server: the snapshot and this device's rows. */
export interface DataDeleteApi {
  /** After this the device token stops working, and the HTTP client registers the phone again. */
  deleteData(backupToken: string | null): Promise<void>;
}

const BACKUP_PATH = '/v1/backup';
/** A snapshot is larger than other requests, so it gets longer than the usual ten seconds. */
export const BACKUP_TIMEOUT_MS = 20_000;

const tokenHeader = (token: string) => ({ headers: { 'X-Backup-Token': token } });

function expectDeleted(json: unknown): void {
  if ((json as { deleted?: unknown } | null)?.deleted !== true) throw new Error('Not deleted');
}

export function createBackupApi(http: HttpClient): BackupApi & DataDeleteApi {
  return {
    put: (token, snapshot) =>
      http.request(
        'PUT',
        BACKUP_PATH,
        { snapshot },
        (json) => {
          if (typeof (json as { updatedAt?: unknown } | null)?.updatedAt !== 'string') {
            throw new Error('No update time');
          }
        },
        { ...tokenHeader(token), timeoutMs: BACKUP_TIMEOUT_MS },
      ),
    get: async (token) => {
      try {
        return await http.request(
          'GET',
          BACKUP_PATH,
          null,
          (json) => {
            const snapshot = (json as { snapshot?: unknown } | null)?.snapshot;
            if (typeof snapshot !== 'object' || snapshot === null) throw new Error('No snapshot');
            return snapshot;
          },
          { ...tokenHeader(token), timeoutMs: BACKUP_TIMEOUT_MS },
        );
      } catch (error) {
        if ((error as { code?: unknown } | null)?.code === 'not_found') return null;
        throw error;
      }
    },
    remove: (token) => http.request('DELETE', BACKUP_PATH, null, expectDeleted, tokenHeader(token)),
    deleteData: (backupToken) =>
      http.post('/v1/data-delete', backupToken === null ? {} : { backupToken }, expectDeleted),
  };
}
