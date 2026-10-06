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
import { revenueCatPurchases } from '../features/plus/revenuecat-port';
import { useLanguage } from '../i18n/i18n-provider';

import { createDayStore, effectSwitches, type DayStore } from './day-store';
import type { DayEvent, DayState } from './day-types';
import { lineFor } from './lines';
import { PlusContext } from './plus-context';
import { createPlusRuntime, readOfferFacts } from './plus-runtime';
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
  const timeZone = () => getCalendars()[0]?.timeZone ?? 'UTC';
  const repositories = openRepositories(db);
  // The store's public SDK key comes from the app's config; with none, nothing can be bought.
  const plus = createPlusRuntime({
    db,
    port: revenueCatPurchases(process.env['EXPO_PUBLIC_REVENUECAT_IOS_KEY']),
    clock: systemClock,
    notifications: nativeNotifications,
    timeZone,
    voice: () => ({ language: language(), attitude: store.getState().settings.attitude }),
    offerFacts: () => readOfferFacts(repositories, store.getState()),
  });
  const store: DayStore = createDayStore({
    repositories,
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
    // The daily limit follows what the store last said, through the domain's entitlement rules.
    plus: () => plus.store.getState().unlocked.plus,
  });
  return { store, motion, cues, plus };
}

const DayStoreContext = createContext<DayStore | null>(null);
const CueContext = createContext<(cue: string) => void>(() => undefined);

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
    const { store, motion, cues, plus } = app;
    const send = (event: DayEvent) => void store.dispatch(event).catch(() => undefined);
    // What was last known about Plus is read before today is built, so the daily limit is right
    // with no connection; the store is asked afterwards and on every return to the app.
    const entitlement = plus.store.subscribe(() => {
      if (store.getState().ready) send({ type: 'entitlement_changed' });
      void plus.syncReminders();
    });
    void plus.store
      .load()
      .then(() => store.start())
      .then(() => cues.warm())
      .then(() => plus.refresh())
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
      if (next === 'active') {
        send({ type: 'app_foregrounded' });
        void plus.refresh();
      }
      if (next === 'background') send({ type: 'app_backgrounded' });
    });
    const network = addNetworkStateListener((state) => {
      if (state.isInternetReachable ?? state.isConnected) send({ type: 'connection_returned' });
    });
    return () => {
      entitlement();
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
      <PlusContext.Provider value={app.plus}>
        <CueContext.Provider value={playCue}>
          <SessionRelaunch store={app.store} />
          {children}
        </CueContext.Provider>
      </PlusContext.Provider>
    </DayStoreContext.Provider>
  );
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
  const { taskCall, notice, heardDeadlines, settings, pick, energyNeeded, oneMore } = state;
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
      oneMore,
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
      oneMore,
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
