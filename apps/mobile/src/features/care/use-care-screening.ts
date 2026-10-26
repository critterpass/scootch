import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { appHttp } from '../../api/app-http';
import { createScreenClient } from '../../api/screen-client';
import { useLanguage } from '../../i18n/i18n-provider';
import { useBoardStore } from '../../state/board-provider';
import { addNetworkStateListener, getNetworkStateAsync } from '../offline/connection';

import { careActions } from './care-actions';
import { memory, readBeFunny } from './care-memory';
import { ASK_AGAIN_MS, createScreening, tasksToScreen } from './screening';

/**
 * Screens every task said, for the whole app: at launch, whenever something new is said, when the
 * connection returns and when the app comes back to the front. The phone's keyword gate has
 * already run when a task is said; this asks the server, and until it answers the task is plain.
 */
export function useCareScreening(): void {
  const db = useSQLiteContext();
  const store = useBoardStore();
  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;

  const screening = useMemo(
    () =>
      createScreening({
        store,
        client: createScreenClient(appHttp(() => languageRef.current)),
        care: careActions(store, db),
        language: () => languageRef.current,
        online: async () => {
          const state = await getNetworkStateAsync();
          return state.isConnected === true && state.isInternetReachable !== false;
        },
        beFunny: () => readBeFunny(db),
        plainCompany: memory.get,
      }),
    [store, db],
  );

  useEffect(() => {
    void memory.load(db);
    let waiting = '';
    const run = () => void screening.run().catch(() => undefined);
    const check = () => {
      const ids = tasksToScreen(store.getSnapshot().board.map((ranked) => ranked.task))
        .map((task) => task.id)
        .join(',');
      if (ids === waiting) return;
      waiting = ids;
      if (ids !== '') run();
    };
    check();
    const unsubscribe = store.subscribe(check);
    const network = addNetworkStateListener((state) => {
      if (state.isConnected) run();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    // A task the server would not judge yet is asked about again a little later.
    const timer = setInterval(() => {
      if (waiting !== '') run();
    }, ASK_AGAIN_MS);
    return () => {
      unsubscribe();
      network.remove();
      app.remove();
      clearInterval(timer);
    };
  }, [store, db, screening]);
}
