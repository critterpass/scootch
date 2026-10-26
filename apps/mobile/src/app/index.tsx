import { Stack } from 'expo-router';

import { DeskScreen } from '../features/desk/desk-screen';

/**
 * The desk. It hands over to the session and back by replacing itself, and the camera inside the
 * classroom does the moving, so the stack only crossfades.
 */
export default function Desk() {
  return (
    <>
      <Stack.Screen options={{ animation: 'fade' }} />
      <DeskScreen />
    </>
  );
}
