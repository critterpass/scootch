import { createContext, useContext } from 'react';

import type { HttpClient } from '../api/http-client';
import type { Repositories } from '../data/repositories';
import type { SqlDatabase } from '../data/table';
import { systemClock } from '../effects/native-adapters';
import { createBackup, type Backup } from '../features/backup/backup';
import { createBackupApi } from '../features/backup/backup-api';
import { nativeBackupTokens } from '../features/backup/native-token-stores';
import { deleteEverything, retryServerDelete } from '../features/privacy/data/delete-everything';
import { exportMyData } from '../features/privacy/data/export-data';
import { nativeShareDevice } from '../features/share/native-share-device';

/** The person's data beyond today: the backup, the export and deleting everything. */
export interface DataTools {
  readonly backup: Backup;
  readonly exportMyData: () => Promise<unknown>;
  /** `pending` when the phone is erased and the server has not been reached yet. */
  readonly deleteEverything: () => Promise<'deleted' | 'pending'>;
  /** Finishes a delete the server has not heard of, then backs up if an hour has passed. */
  readonly keepUp: () => Promise<void>;
}

export const DataToolsContext = createContext<DataTools | null>(null);

/** The backup, the export and deleting everything, on the real phone. */
export function useDataTools(): DataTools {
  const tools = useContext(DataToolsContext);
  if (!tools) throw new Error('The data tools are read outside their provider');
  return tools;
}

/** The data tools on the real phone: its database, the API and the keychain's backup token. */
export function createAppDataTools(deps: {
  readonly db: SqlDatabase;
  readonly http: HttpClient;
  readonly repositories: Repositories;
}): DataTools {
  const { db, repositories } = deps;
  const tokens = nativeBackupTokens();
  const server = createBackupApi(deps.http);
  const backup = createBackup({ tokens, api: server, repositories, db, clock: systemClock });
  return {
    backup,
    exportMyData: () =>
      exportMyData({ repositories, clock: systemClock, device: nativeShareDevice }),
    deleteEverything: () => deleteEverything({ db, tokens, server }),
    // A delete the server never heard about is finished first, so nothing is uploaded before it.
    keepUp: () =>
      retryServerDelete({ db, tokens, server })
        .catch(() => undefined)
        .then(() => backup.maybeUpload())
        .catch(() => undefined),
  };
}
