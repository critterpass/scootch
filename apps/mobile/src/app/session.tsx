import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { SessionScreen } from '../features/session/session-screen';
import { TableStrip } from '../features/table/table-strip';
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
    // The session is closed in storage before the one screen underneath is uncovered, by the same
    // fade the session arrived with: home never finds a session it would send the person back to.
    void dispatch({ type: 'session_closed' })
      .catch(() => undefined)
      .then(() => router.dismissTo('/'));
  }, [over, dispatch, router]);

  if (crisis) return <Redirect href="/care" />;
  // At a table, the session is the same session with the table's critters in a strip above it.
  return (
    <View style={{ flex: 1 }}>
      <TableStrip />
      <SessionScreen model={model} actions={actions} />
    </View>
  );
}
