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
import { CROSSFADE_MS, EASE_OUT, STAMP } from './motion-tokens';
import { useMayMove } from './use-feel';

/** The numbers of one stamp: where it comes from and how it lands. */
export type StampShape = { readonly [K in keyof typeof STAMP]: number };

export interface StampInProps {
  /** How long it waits before coming down, in milliseconds. */
  readonly delayMs?: number;
  /** The angle it rests at, in degrees. */
  readonly restDeg?: number;
  readonly shape?: StampShape;
  /** Called at the moment it lands, for its sound and haptic. */
  readonly onLand?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly children: ReactNode;
}

/**
 * The design's stamp: it comes down large and turned, squashes as it lands, bounces once and
 * settles at its resting angle. Where nothing may move it fades in. It runs on the UI thread.
 */
export function StampIn({
  delayMs = 0,
  restDeg = -8,
  shape = STAMP,
  onLand,
  style,
  testID,
  children,
}: StampInProps) {
  const mayMove = useMayMove();
  const shown = useSharedValue(0);
  const total = shape.landMs + shape.bounceMs + shape.settleMs;
  const landAt = shape.landMs / total;
  const bounceAt = (shape.landMs + shape.bounceMs) / total;

  useEffect(() => {
    const landed = () => onLand?.();
    shown.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: mayMove ? total : CROSSFADE_MS,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.Never,
      }),
    );
    // The landing is felt when the stamp meets the card, not when it has finished settling.
    const timer = setTimeout(landed, delayMs + (mayMove ? shape.landMs * 0.5 : 0));
    return () => {
      clearTimeout(timer);
      cancelAnimation(shown);
    };
    // Played once per mount.
  }, [shown]);

  const stamping = useAnimatedStyle(() => {
    if (!mayMove) {
      return { opacity: shown.value, transform: [{ rotate: `${restDeg}deg` }, { scale: 1 }] };
    }
    const turn = interpolate(
      shown.value,
      [0, landAt, bounceAt, 1],
      [restDeg + shape.fromTurnDeg, restDeg + shape.landTurnDeg, restDeg, restDeg],
    );
    const scale = interpolate(
      shown.value,
      [0, landAt, bounceAt, 1],
      [shape.fromScale, shape.landScale, shape.bounceScale, 1],
    );
    return {
      opacity: interpolate(shown.value, [0, landAt * 0.6], [0, 1], 'clamp'),
      transform: [{ rotate: `${turn}deg` }, { scale }],
    };
  }, [mayMove, restDeg, shape, landAt, bounceAt]);

  return (
    <Animated.View testID={testID} pointerEvents="none" style={[plainStyle(style), stamping]}>
      {children}
    </Animated.View>
  );
}
