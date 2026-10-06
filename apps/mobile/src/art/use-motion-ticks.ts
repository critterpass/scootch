import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { createMotionRunner, runWhileVisible, type VisibilitySource } from './motion-runner';

const APP: VisibilitySource = {
  appActive: () => AppState.currentState === 'active',
  onAppActiveChange: (listener) => {
    const subscription = AppState.addEventListener('change', (next) => listener(next === 'active'));
    return () => subscription.remove();
  },
};

/**
 * Calls `onTick` with the seconds of motion so far while `moving` is true, the screen is focused
 * and the app is in the foreground. Off the screen or in the background nothing is scheduled.
 */
export function useMotionTicks(moving: boolean, onTick: (seconds: number) => void): void {
  const focused = useIsFocused();
  const latest = useRef(onTick);
  latest.current = onTick;
  const gate = useRef<ReturnType<typeof runWhileVisible> | null>(null);

  useEffect(() => {
    const made = runWhileVisible(
      createMotionRunner((seconds) => latest.current(seconds)),
      APP,
    );
    gate.current = made;
    return () => {
      made.dispose();
      gate.current = null;
    };
  }, []);

  useEffect(() => {
    gate.current?.setFocused(focused);
    gate.current?.setMoving(moving);
  }, [focused, moving]);
}
