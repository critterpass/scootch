import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { plainStyle } from './animated-style';
import { BOUNCE_CURVE, CROSSFADE_MS, STAMP } from './motion-tokens';
import { useMayMove } from './use-feel';

const ALWAYS = ReduceMotion.Never;
const LAND_MS = STAMP.ms * STAMP.landAt;
const SETTLE_MS = STAMP.ms - LAND_MS;

export interface StampInProps {
  /** How long it waits before coming down, in milliseconds. */
  readonly delayMs?: number;
  /** The angle it rests at, in degrees. It comes down at that angle and never turns. */
  readonly restDeg?: number;
  /** Called at the moment it lands, for its sound and haptic. */
  readonly onLand?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly children: ReactNode;
}

/**
 * The boards' `stampIn`: it comes down from 1.9 at nothing, lands at 0.94 by 55% of its 520 ms
 * and settles at 1, at its resting angle throughout, each step on the character curve. Where
 * nothing may move it fades in. It runs on the UI thread.
 */
export function StampIn({
  delayMs = 0,
  restDeg = -8,
  onLand,
  style,
  testID,
  children,
}: StampInProps) {
  const mayMove = useMayMove();
  // Each runs 0 to 1 on the character curve, overshooting on the way: the landing, then the settle.
  const land = useSharedValue(0);
  const settle = useSharedValue(0);

  useEffect(() => {
    const curve = { easing: BOUNCE_CURVE, reduceMotion: ALWAYS };
    land.value = withDelay(
      delayMs,
      withTiming(
        1,
        mayMove
          ? { duration: LAND_MS, ...curve }
          : { duration: CROSSFADE_MS, reduceMotion: ALWAYS },
      ),
    );
    if (mayMove) {
      settle.value = withDelay(delayMs + LAND_MS, withTiming(1, { duration: SETTLE_MS, ...curve }));
    }
    // The landing is felt when the stamp meets the paper, not when it has finished settling.
    const timer = setTimeout(() => onLand?.(), delayMs + (mayMove ? LAND_MS : 0));
    return () => {
      clearTimeout(timer);
      cancelAnimation(land);
      cancelAnimation(settle);
    };
    // Played once per mount.
  }, [land, settle]);

  const stamping = useAnimatedStyle(() => {
    const opacity = Math.min(1, Math.max(0, land.value));
    if (!mayMove) return { opacity, transform: [{ rotate: `${restDeg}deg` }, { scale: 1 }] };
    const scale =
      settle.value > 0
        ? STAMP.landScale + (1 - STAMP.landScale) * settle.value
        : STAMP.fromScale + (STAMP.landScale - STAMP.fromScale) * land.value;
    return { opacity, transform: [{ rotate: `${restDeg}deg` }, { scale }] };
  }, [mayMove, restDeg]);

  return (
    <Animated.View testID={testID} pointerEvents="none" style={[plainStyle(style), stamping]}>
      {children}
    </Animated.View>
  );
}
