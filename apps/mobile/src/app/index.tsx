import { Stack } from 'expo-router';

import { DeskScreen } from '../features/desk/desk-screen';

/**
 * The desk. It hands over to the session and back by replacing itself, and the camera inside the
 * classroom does the moving. Both screens hold the same shot of the room as they swap, so the
 * stack plays nothing of its own: a native fade on a replace fades the new screen in over an empty
 * one, a flash of bare wall. The camera moves once the new screen has arrived.
 */
export default function Desk() {
  return (
    <>
      <Stack.Screen options={{ animation: 'none' }} />
      <DeskScreen />
    </>
  );
}
