import { useEffect, useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { plainStyle } from './animated-style';
import { CROSSFADE_MS, SPRING_CURVE } from './motion-tokens';
import { useMayMove } from './use-feel';

/** A part settles back in over this long, and steps aside faster than it came. */
const IN_MS = 420;
const OUT_MS = 220;
/** How far it sinks, and how much it shrinks, on its way out. */
const SINK = 12;
const FROM_SCALE = 0.96;

export interface FadeAwayProps {
  /** False steps the part aside: it fades, sinks a little, and is then taken off the screen. */
  readonly shown: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/**
 * A part that steps aside while something else has the screen and comes back after. It moves by
 * opacity and transform on the UI thread, takes no touch while it is leaving, and gives its room
 * back once it is gone. Where nothing may move it is a short crossfade.
 */
export function FadeAway({ shown, style, children }: FadeAwayProps) {
  const mayMove = useMayMove();
  const [mounted, setMounted] = useState(shown);
  if (shown && !mounted) setMounted(true);
  const there = useSharedValue(shown ? 1 : 0);

  useEffect(() => {
    const duration = !mayMove ? CROSSFADE_MS : shown ? IN_MS : OUT_MS;
    there.value = withTiming(
      shown ? 1 : 0,
      { duration, easing: SPRING_CURVE, reduceMotion: ReduceMotion.Never },
      (finished) => {
        if (finished && !shown) scheduleOnRN(setMounted, false);
      },
    );
  }, [mayMove, shown, there]);

  const fading = useAnimatedStyle(
    () => ({
      opacity: there.value,
      transform: mayMove
        ? [
            { translateY: SINK * (1 - there.value) },
            { scale: FROM_SCALE + (1 - FROM_SCALE) * there.value },
          ]
        : [{ translateY: 0 }, { scale: 1 }],
    }),
    [mayMove],
  );

  if (!mounted) return null;
  return (
    <Animated.View pointerEvents={shown ? 'auto' : 'none'} style={[plainStyle(style), fading]}>
      {children}
    </Animated.View>
  );
}
