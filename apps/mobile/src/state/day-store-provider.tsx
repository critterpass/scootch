import { randomUUID } from 'expo-crypto';
import { getCalendars } from 'expo-localization';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import {
  createContext,
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

import { apiBaseUrl, keychainTokenStore } from '../api/api-config';
import { createHttpClient } from '../api/http-client';
import { createScootchApi } from '../api/scootch-api';
import { createTaskClient } from '../api/task-client';
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
import { useLanguage } from '../i18n/i18n-provider';

import { createDayStore, effectSwitches, type DayStore } from './day-store';
import type { DayEvent, DayState } from './day-types';

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
  const store: DayStore = createDayStore({
    repositories: openRepositories(db),
    clock: systemClock,
    timeZone: () => getCalendars()[0]?.timeZone ?? 'UTC',
    nextId: randomUUID,
    tasks: createTaskClient(createScootchApi(http)),
    online: async () => {
      const network = await getNetworkStateAsync();
      return network.isInternetReachable ?? network.isConnected ?? false;
    },
    runner,
    phoneLanguage: language,
    // Nothing in this layer knows about purchases: every phone has the free day.
    plus: () => false,
  });
  return { store, motion, cues };
}

const DayStoreContext = createContext<DayStore | null>(null);

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
    const { store, motion, cues } = app;
    const send = (event: DayEvent) => void store.dispatch(event).catch(() => undefined);
    void store
      .start()
      .then(() => cues.warm())
      .catch(() => undefined);

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        motion.reduced = reduced;
      })
      .catch(() => undefined);
    const reduceMotion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      motion.reduced = reduced;
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') send({ type: 'app_foregrounded' });
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

  return <DayStoreContext.Provider value={app.store}>{children}</DayStoreContext.Provider>;
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
  const { taskCall, notice, heardDeadlines, settings } = state;
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
    ],
  );
}

/** The session, and what the effects runner last showed: a line, a burst, the treat, parked thoughts. */
export function useSession() {
  const { session, line, burst, treat, parkedThoughts } = useDayState();
  return useMemo(
    () => ({ session, line, burst, treat, parkedThoughts }),
    [session, line, burst, treat, parkedThoughts],
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
