import { randomUUID } from 'expo-crypto';
import { getCalendars } from 'expo-localization';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

import type { Language } from '@scootch/domain';
import { CUES } from '@scootch/sound';

import { apiBaseUrl, keychainTokenStore } from '../api/api-config';
import { createHttpClient } from '../api/http-client';
import { createScootchApi } from '../api/scootch-api';
import { createStagedTaskClient } from '../api/staged-task-client';
import { openRepositories } from '../data/repositories';
import { createEffectsRunner } from '../effects/effects-runner';
import {
  nativeCuePlayer,
  nativeHaptics,
  nativeLiveActivity,
  nativeNotifications,
  systemClock,
  systemTimers,
} from '../effects/native-adapters';
import { createBackup, type Backup } from '../features/backup/backup';
import { createBackupApi } from '../features/backup/backup-api';
import { nativeBackupTokens } from '../features/backup/native-token-stores';
import { deleteEverything, retryServerDelete } from '../features/privacy/data/delete-everything';
import { exportMyData } from '../features/privacy/data/export-data';
import { nativeShareDevice } from '../features/share/native-share-device';
import {
  nativeSharedFiles,
  nativeSharedStore,
  skiaMonsterPainter,
} from '../features/surfaces/native-surface-ports';
import { createSurfaceSync } from '../features/surfaces/surface-sync';
import { SurfaceSyncHost } from '../features/surfaces/surface-sync-host';
import { useLanguage } from '../i18n/i18n-provider';

import { createDayStore, effectSwitches, type DayStore } from './day-store';
import type { DayEvent, DayState } from './day-types';
import { lineFor } from './lines';
import { SessionRelaunch } from './session-relaunch';

/** The day store on the real phone: its database, the API, and the native effects. */
function createAppDayStore(db: SQLiteDatabase, language: () => Language) {
  const motion = { reduced: false };
  const cues = nativeCuePlayer();
  const http = createHttpClient({
    baseUrl: apiBaseUrl(),
    fetch: (input, init) => fetch(input, init),
    tokens: keychainTokenStore,
    language,
  });
  const runner = createEffectsRunner({
    clock: systemClock,
    timers: systemTimers,
    cues,
    haptics: nativeHaptics,
    notifications: nativeNotifications,
    liveActivity: nativeLiveActivity,
    screen: {
      showLine: (slot, text) => store.screen.showLine(slot, text),
      showBurst: (burst) => store.screen.showBurst(burst),
      handOverTreat: (treat) => store.screen.handOverTreat(treat),
      showParkedThoughts: (thoughts) => store.screen.showParkedThoughts(thoughts),
    },
    switches: () => effectSwitches(store.getState(), motion.reduced),
    onClock: () => void store.dispatch({ type: 'session', event: { type: 'clock' } }),
  });
  const repositories = openRepositories(db);
  // Nothing in this layer knows about purchases: every phone has the free day.
  const plus = () => false;
  const timeZone = () => getCalendars()[0]?.timeZone ?? 'UTC';
  const tokens = nativeBackupTokens();
  const server = createBackupApi(http);
  const backup = createBackup({ tokens, api: server, repositories, db, clock: systemClock });
  const data: DataTools = {
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
  const store: DayStore = createDayStore({
    repositories,
    // A finished thing is backed up at once; a failed upload is tried again within the hour.
    onFinished: () => void backup.afterFinish().catch(() => undefined),
    clock: systemClock,
    timeZone,
    nextId: randomUUID,
    tasks: createStagedTaskClient(createScootchApi(http)),
    online: async () => {
      const network = await getNetworkStateAsync();
      return network.isInternetReachable ?? network.isConnected ?? false;
    },
    runner,
    phoneLanguage: language,
    plus,
  });
  // The widgets, the Live Activity and the control read today from the App Group.
  const surfaces = createSurfaceSync({
    store,
    repositories,
    shared: nativeSharedStore(),
    files: nativeSharedFiles(),
    painter: skiaMonsterPainter,
    plus,
    now: () => systemClock.now(),
    timeZone,
  });
  return { store, motion, cues, data, surfaces };
}

/** The person's data beyond today: the backup, the export and deleting everything. */
export interface DataTools {
  readonly backup: Backup;
  readonly exportMyData: () => Promise<unknown>;
  /** `pending` when the phone is erased and the server has not been reached yet. */
  readonly deleteEverything: () => Promise<'deleted' | 'pending'>;
  /** Finishes a delete the server has not heard of, then backs up if an hour has passed. */
  readonly keepUp: () => Promise<void>;
}

const DayStoreContext = createContext<DayStore | null>(null);
const CueContext = createContext<(cue: string) => void>(() => undefined);
const DataToolsContext = createContext<DataTools | null>(null);

/**
 * Makes the day store, rebuilds today from storage, and feeds it the app's comings and goings and
 * the connection's return. Mounted once, above every screen.
 */
export function DayStoreProvider({ children }: { readonly children: ReactNode }) {
  const db = useSQLiteContext();
  const { language } = useLanguage();
  const languageNow = useRef(language);
  languageNow.current = language;
  const [app] = useState(() => createAppDayStore(db, () => languageNow.current));

  useEffect(() => {
    const { store, motion, cues, data } = app;
    const send = (event: DayEvent) => void store.dispatch(event).catch(() => undefined);
    void store
      .start()
      .then(() => cues.warm())
      .catch(() => undefined)
      .then(() => data.keepUp());

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        motion.reduced = reduced;
      })
      .catch(() => undefined);
    const reduceMotion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      motion.reduced = reduced;
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        send({ type: 'app_foregrounded' });
        void data.keepUp();
      }
      if (next === 'background') send({ type: 'app_backgrounded' });
    });
    const network = addNetworkStateListener((state) => {
      if (state.isInternetReachable ?? state.isConnected) send({ type: 'connection_returned' });
    });
    return () => {
      reduceMotion.remove();
      appState.remove();
      network.remove();
    };
  }, [app]);

  // A cue asked for by a screen, through the runner's own player and under the same switches.
  const playCue = useCallback(
    (name: string) => {
      const switches = effectSwitches(app.store.getState(), app.motion.reduced);
      if (switches.effects) app.cues.play(name);
      const taps = CUES[name]?.haptics ?? [];
      const felt = switches.reducedMotion ? taps.slice(0, 1) : taps;
      if (switches.haptics && felt.length > 0) nativeHaptics.play(felt);
    },
    [app],
  );

  return (
    <DayStoreContext.Provider value={app.store}>
      <CueContext.Provider value={playCue}>
        <DataToolsContext.Provider value={app.data}>
          <SessionRelaunch store={app.store} />
          <SurfaceSyncHost store={app.store} sync={app.surfaces} />
          {children}
        </DataToolsContext.Provider>
      </CueContext.Provider>
    </DayStoreContext.Provider>
  );
}

/** The backup, the export and deleting everything, on the real phone. */
export function useDataTools(): DataTools {
  const tools = useContext(DataToolsContext);
  if (!tools) throw new Error('The data tools are read outside their provider');
  return tools;
}

/** Plays one named sound cue with its haptics, obeying the person's sound and haptics switches. */
export function useCue(): (cue: string) => void {
  return useContext(CueContext);
}

function useDayStore(): DayStore {
  const store = useContext(DayStoreContext);
  if (!store) throw new Error('The day store is read outside its provider');
  return store;
}

function useDayState(): DayState {
  const store = useDayStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Today as the one screen shows it. `ready` is false until it has been rebuilt from storage. */
export function useToday() {
  const state = useDayState();
  const { ready, localDate, today, morning, monster, monsterPending } = state;
  const { taskCall, notice, heardDeadlines, settings, pick, energyNeeded } = state;
  const { modelDown, reminderAt } = state;
  return useMemo(
    () => ({
      ready,
      localDate,
      today,
      morning,
      monster,
      monsterPending,
      taskCall,
      notice,
      heardDeadlines,
      settings,
      pick,
      energyNeeded,
      modelDown,
      reminderAt,
    }),
    [
      ready,
      localDate,
      today,
      morning,
      monster,
      monsterPending,
      taskCall,
      notice,
      heardDeadlines,
      settings,
      pick,
      energyNeeded,
      modelDown,
      reminderAt,
    ],
  );
}

/**
 * The session, and what the effects runner last showed: a line, a burst, the treat, parked
 * thoughts. `tinyNextStep` is the task's own smallest step, for stuck help.
 */
export function useSession() {
  const { session, line, burst, treat, parkedThoughts, today, settings } = useDayState();
  const task = 'task' in today ? today.task : null;
  return useMemo(
    () => ({
      session,
      line,
      burst,
      treat,
      parkedThoughts,
      tinyNextStep: task ? lineFor('tinyNextStep', task, settings) : null,
    }),
    [session, line, burst, treat, parkedThoughts, task, settings],
  );
}

/** The drawer: whether it is showing, and what is parked in it. */
export function useDrawer(): DayState['drawer'] {
  return useDayState().drawer;
}

/** Sends an event to the day store, which applies it at the current time. */
export function useDispatch(): (event: DayEvent) => Promise<void> {
  return useDayStore().dispatch;
}
