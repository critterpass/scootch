import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  createMotionRunner,
  runWhileVisible,
  shownInAppState,
  TICK_HZ,
  type MotionRunner,
  type VisibilitySource,
} from './motion-runner';

const APP: VisibilitySource = {
  appActive: () => shownInAppState(AppState.currentState),
  onAppActiveChange: (listener) => {
    const subscription = AppState.addEventListener('change', (next) =>
      listener(shownInAppState(next)),
    );
    return () => subscription.remove();
  },
};

/**
 * Calls `onTick` with the seconds of motion so far, `hz` times a second, while `moving` is true,
 * the screen is focused and the app is on the screen. Off the screen or in the background nothing
 * is scheduled.
 */
export function useMotionTicks(
  moving: boolean,
  onTick: (seconds: number) => void,
  hz: number = TICK_HZ,
): void {
  useMotionTicksWhile(moving, useIsFocused(), onTick, hz);
}

/**
 * The same ticks for a place that cannot ask whether its screen is focused: something drawn
 * inside a canvas, which has its own tree and none of the app's contexts. Whoever draws the
 * canvas asks, and passes the answer in.
 */
export function useMotionTicksWhile(
  moving: boolean,
  focused: boolean,
  onTick: (seconds: number) => void,
  hz: number = TICK_HZ,
): void {
  const latest = useRef(onTick);
  latest.current = onTick;
  const runner = useRef<MotionRunner | null>(null);
  const gate = useRef<ReturnType<typeof runWhileVisible> | null>(null);

  useEffect(() => {
    const made = createMotionRunner((seconds) => latest.current(seconds));
    const gated = runWhileVisible(made, APP);
    runner.current = made;
    gate.current = gated;
    return () => {
      gated.dispose();
      runner.current = null;
      gate.current = null;
    };
  }, []);

  useEffect(() => {
    runner.current?.setRate(hz);
    gate.current?.setFocused(focused);
    gate.current?.setMoving(moving);
  }, [focused, moving, hz]);
}
