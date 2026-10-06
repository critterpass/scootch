import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { SessionScreen } from '../features/session/session-screen';
import { useSessionScreen } from '../features/session/use-session-screen';
import { useDispatch, useToday } from '../state/day-store-provider';

/**
 * The session, from the start burst to the last parked thought. The one screen sends the person
 * here when Start is tapped, and opening the app mid-session lands here too. When there is nothing
 * left to show, what the session handed over is cleared and the one screen is back.
 */
export default function SessionRoute() {
  const { model, actions } = useSessionScreen();
  const router = useRouter();
  const dispatch = useDispatch();
  // Until today has been rebuilt from storage there is no session to judge.
  const { ready, today } = useToday();
  // A crisis day beats a session that was running: nothing of it is shown, and care takes over.
  const crisis = ready && today.kind === 'crisis';
  const over = ready && !crisis && model.view.kind === 'home';

  useEffect(() => {
    if (!over) return;
    void dispatch({ type: 'session_closed' }).catch(() => undefined);
    router.replace('/');
  }, [over, dispatch, router]);

  if (crisis) return <Redirect href="/care" />;
  return <SessionScreen model={model} actions={actions} />;
}
