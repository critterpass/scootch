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
import { CROSSFADE_MS, RISE, SPRING_CURVE, staggerDelay } from './motion-tokens';
import { useMayMove } from './use-feel';

export interface RiseInProps {
  /** Its place among the parts that rise together: each waits 70 ms longer than the one before. */
  readonly index?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly children: ReactNode;
}

/**
 * The design's entrance: a part rises 28 points and fades in over 900 ms on the spring curve, its
 * siblings following by the stagger. It plays once, when the part mounts; give it a `key` to play
 * it again for new content. The curve is front-loaded, so the part is all but in place within a
 * third of a second. Where nothing may move it is a short crossfade. It runs on the UI thread.
 */
export function RiseIn({ index = 0, style, testID, children }: RiseInProps) {
  const mayMove = useMayMove();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = mayMove
      ? withDelay(
          staggerDelay(index),
          withTiming(1, {
            duration: RISE.ms,
            easing: SPRING_CURVE,
            reduceMotion: ReduceMotion.Never,
          }),
        )
      : withTiming(1, { duration: CROSSFADE_MS, reduceMotion: ReduceMotion.Never });
    return () => cancelAnimation(shown);
    // Played once per mount: a change of the switch mid-way does not start it over.
  }, [shown]);

  const rising = useAnimatedStyle(() => {
    if (!mayMove) return { opacity: shown.value, transform: [{ translateY: 0 }, { scale: 1 }] };
    return {
      // Opacity leads, so the part can be seen and touched while it is still settling.
      opacity: Math.min(1, shown.value * 2.5),
      transform: [
        { translateY: RISE.fromY * (1 - shown.value) },
        { scale: RISE.fromScale + (1 - RISE.fromScale) * shown.value },
      ],
    };
  }, [mayMove]);

  return (
    <Animated.View testID={testID} style={[plainStyle(style), rising]}>
      {children}
    </Animated.View>
  );
}
