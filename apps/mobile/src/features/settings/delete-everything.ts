import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { appHttp } from '../../api/app-http';
import { deleteServerData, forgetDeviceToken } from '../../api/data-delete-client';
import type { HttpClient } from '../../api/http-client';
import type { DataDatabase } from '../../data/data-database';
import { readSetting, writeSetting } from '../../data/settings-repository';
import { useLanguage } from '../../i18n/i18n-provider';
import type { BoardStore } from '../../state/board-store';
import { memory } from '../care/care-memory';
import { forgetFirstDay } from '../first-day/student';
import { cancelNotes } from '../notes/notes-home';
import { getNetworkStateAsync } from '../offline/connection';

import { wipePhone } from './everything';

/** Set when the phone was wiped but the server could not be reached: it is asked again. */
const SERVER_LEFT = 'privacy.server-delete-pending';

/**
 * Delete everything: the server's copy first (this phone's registration, push tokens), then every
 * table on the phone, his notes, and the device token. With no connection the phone is still
 * wiped at once and the server is asked again at the next launch with a connection.
 */
export async function deleteEverything(deps: {
  readonly db: DataDatabase;
  readonly store: BoardStore;
  readonly http: HttpClient;
}): Promise<void> {
  const serverDone = await deleteServerData(deps.http).then(
    () => true,
    () => false,
  );
  await cancelNotes().catch(() => undefined);
  await wipePhone(deps.db);
  if (serverDone) {
    await forgetDeviceToken().catch(() => undefined);
  } else {
    // The device token is kept until the server has been told.
    await writeSetting(deps.db, SERVER_LEFT, true);
  }
  memory.forget();
  forgetFirstDay();
  await deps.store.load();
}

/** At launch: tells the server about a delete that happened while the phone was offline. */
export function useDeleteEverythingLeftover(): void {
  const db = useSQLiteContext();
  const { language } = useLanguage();
  useEffect(() => {
    let current = true;
    void (async () => {
      if ((await readSetting<boolean>(db, SERVER_LEFT)) !== true) return;
      const network = await getNetworkStateAsync();
      if (!current || !network.isConnected) return;
      await deleteServerData(appHttp(() => language));
      await writeSetting(db, SERVER_LEFT, null);
      await forgetDeviceToken();
    })().catch(() => undefined);
    return () => {
      current = false;
    };
    // Once per launch.
  }, [db]);
}
