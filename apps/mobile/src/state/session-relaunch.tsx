import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { DayStore } from './day-store';
import type { DayState } from './day-types';
import { UNDER_WAY } from './session-flow';

/** The session screens' route. The one screen sends the person here when Start is tapped. */
export const SESSION_ROUTE = '/session' as Href;

/** True when today, as rebuilt from storage, has a session that is under way or waiting for its end. */
export function opensOnSession(state: Pick<DayState, 'ready' | 'session'>): boolean {
  return state.ready && state.session !== null && UNDER_WAY.includes(state.session.phase);
}

/**
 * Opening the app in the middle of a session lands on the session, not on the one screen. It looks
 * once, when the store has rebuilt today from storage; a session started later is the one
 * screen's own navigation.
 */
export function SessionRelaunch({ store }: { readonly store: DayStore }) {
  const router = useRouter();
  const looked = useRef(false);

  useEffect(() => {
    const look = () => {
      const state = store.getState();
      if (looked.current || !state.ready) return;
      looked.current = true;
      if (opensOnSession(state)) router.replace(SESSION_ROUTE);
    };
    look();
    return store.subscribe(look);
  }, [store, router]);

  return null;
}
