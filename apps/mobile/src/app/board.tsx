import { Stack } from 'expo-router';

import { BoardScreen } from '../features/board/board-screen';

/**
 * The board. It is laid over the desk with nothing played by the system: the board grows out of
 * the chalkboard by itself, and the desk stays visible around it while it does.
 */
export default function Board() {
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
      <BoardScreen />
    </>
  );
}
