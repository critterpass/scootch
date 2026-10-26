import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import type { BoardStore } from '../../state/board-store';

import { nativeActivityPort, nativeSharedStore } from './native-surface-ports';
import { planPendingActions, readPendingActions } from './pending-actions';
import { surfaceInputs } from './surface-inputs';
import { createSurfacesSync, SHARED_KEYS, type SharedStore } from './surfaces-sync';

/** The intents may write a moment after the app comes to the front, so the list is read twice. */
const READ_AGAIN_MS = 1500;

/**
 * Takes what Siri, Shortcuts, a widget or the Live Activity asked for off the App Group and does
 * it: every word said goes on the board, as if said at the desk; Start starts the desk's period;
 * Done finishes it. The desk moves to the period or the finish by itself.
 */
function actOnPending(shared: SharedStore, store: BoardStore, goToDesk: () => void): void {
  const json = shared.get(SHARED_KEYS.pendingActions);
  if (json === null || json === '') return;
  shared.remove(SHARED_KEYS.pendingActions);
  const { add, press } = planPendingActions(readPendingActions(json), Date.now());
  for (const text of add) void store.say(text);
  if (press === null) return;
  const board = store.getSnapshot();
  const deskId = board.desk?.task.id ?? null;
  const forThisTask = press.taskId === null || press.taskId === deskId;
  if (press.kind === 'start' && board.phase === 'waiting' && forThisTask) {
    void store.start().then(goToDesk);
  } else if (press.kind === 'done' && board.phase !== 'waiting' && board.session !== null) {
    if (press.taskId === null || press.taskId === board.session.taskId) {
      void store.finish().then(goToDesk);
    }
  } else {
    goToDesk();
  }
}

/**
 * Phu's Class outside the app, kept in step with the board: the widgets' snapshot in the App
 * Group, and the Live Activity on the desk (his face at the pressure, the fuse) and in a period
 * (the time left, his pacing). Renders nothing.
 */
export function SurfacesHost(): null {
  const board = useBoard();
  const store = useBoardStore();
  const router = useRouter();
  const { language } = useLanguage();
  const inputs = useSyncExternalStore(surfaceInputs.subscribe, surfaceInputs.get);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const shared = useMemo(() => nativeSharedStore(), []);
  const sync = useMemo(
    () => createSurfacesSync({ store: shared, activity: nativeActivityPort }),
    [shared],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    sync.sync(board, inputs, language, foreground);
  }, [sync, board, inputs, language, foreground]);

  const ready = board.phase !== 'loading';
  useEffect(() => {
    if (!foreground || !ready) return undefined;
    const goToDesk = () => router.navigate('/');
    actOnPending(shared, store, goToDesk);
    const timer = setTimeout(() => actOnPending(shared, store, goToDesk), READ_AGAIN_MS);
    return () => clearTimeout(timer);
  }, [foreground, ready, shared, store, router]);

  return null;
}
