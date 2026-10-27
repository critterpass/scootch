import { Stack } from 'expo-router';

import { SessionScreen } from '../features/session/session-screen';

/**
 * A running period. It replaces the desk with no swipe back, and on the desk's shot of the room,
 * so the swap shows one room and the stack plays nothing of its own (see `index.tsx`); the
 * classroom's camera pulls back once it has arrived. The way out is Done or Not yet.
 */
export default function Session() {
  return (
    <>
      <Stack.Screen options={{ animation: 'none' }} />
      <SessionScreen />
    </>
  );
}
