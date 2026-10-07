import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { plainStyle } from './animated-style';
import { CROSSFADE_MS, EASE_OUT, POP } from './motion-tokens';
import { useMayMove } from './use-feel';

export interface PopInProps {
  /** How long it waits before popping, in milliseconds. */
  readonly delayMs?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly children: ReactNode;
}

const TOTAL_MS = POP.overMs + POP.settleMs;
const OVER_AT = POP.overMs / TOTAL_MS;

/**
 * The design's pop, for a reward eyebrow: from 0.6 it swells to 1.12 and settles at 1. Where
 * nothing may move it fades in. It runs on the UI thread.
 */
export function PopIn({ delayMs = 0, style, testID, children }: PopInProps) {
  const mayMove = useMayMove();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: mayMove ? TOTAL_MS : CROSSFADE_MS,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.Never,
      }),
    );
    return () => cancelAnimation(shown);
    // Played once per mount.
  }, [shown]);

  const popping = useAnimatedStyle(() => {
    if (!mayMove) return { opacity: shown.value, transform: [{ scale: 1 }] };
    return {
      opacity: interpolate(shown.value, [0, OVER_AT], [0, 1], 'clamp'),
      transform: [
        { scale: interpolate(shown.value, [0, OVER_AT, 1], [POP.fromScale, POP.overScale, 1]) },
      ],
    };
  }, [mayMove]);

  return (
    <Animated.View testID={testID} style={[plainStyle(style), popping]}>
      {children}
    </Animated.View>
  );
}
