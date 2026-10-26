import { Stack } from 'expo-router';

import { LogbookScreen } from '../features/logbook/logbook-screen';

/**
 * The logbook page, lowered over the board. Laid over it with nothing played by the system: the
 * page carries on from the board's pull, and the board shows above it as it goes back up.
 */
export default function Logbook() {
  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          gestureEnabled: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <LogbookScreen />
    </>
  );
}
