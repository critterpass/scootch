import { useMemo, useSyncExternalStore } from 'react';

import { useDayStore, useToday } from './day-store-provider';

/** Today as the one screen shows it, with the time heard for it and whether it is being said back. */
export function useTodayHeard() {
  const day = useToday();
  const store = useDayStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const heardTime = state.heardTime ?? null;
  const heardTimeAsked = state.heardTimeAsked ?? false;
  return useMemo(() => ({ ...day, heardTime, heardTimeAsked }), [day, heardTime, heardTimeAsked]);
}
