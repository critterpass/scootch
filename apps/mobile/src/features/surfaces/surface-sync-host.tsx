import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { DayStore } from '../../state/day-store';
import { SESSION_ROUTE } from '../../state/session-relaunch';

import type { SurfaceSync } from './surface-sync';

/**
 * Runs the surface sync for the life of the app: follows the store, and at launch and on every
 * return to the front picks up what the controls and buttons asked for. A session started that
 * way lands on the session screen.
 */
export function SurfaceSyncHost({
  store,
  sync,
}: {
  readonly store: DayStore;
  readonly sync: SurfaceSync;
}) {
  const router = useRouter();

  useEffect(() => {
    const stopFollowing = sync.follow();
    const opened = () =>
      void sync
        .opened()
        .then((actions) => {
          const session = store.getState().session;
          const started = actions.some((action) => action.kind === 'start_session');
          if (started && session?.phase === 'running') router.replace(SESSION_ROUTE);
        })
        .catch(() => undefined);

    // The first look waits for the store to have rebuilt today from storage.
    let looked = false;
    const firstLook = () => {
      if (looked || !store.getState().ready) return;
      looked = true;
      opened();
    };
    firstLook();
    const stopWaiting = store.subscribe(firstLook);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active' && looked) opened();
    });
    return () => {
      stopFollowing();
      stopWaiting();
      appState.remove();
    };
  }, [store, sync, router]);

  return null;
}
