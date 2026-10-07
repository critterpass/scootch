import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useScreenStyle } from '../../../ui/use-screen-style';

/** The board's sweep: across in a third of 3.8 seconds, then a wait before the next. */
const ACROSS_MS = 1330;
const WAIT_MS = 2470;

export interface SweepProps {
  /** The colours of the band, leading edge first. */
  readonly colors: readonly string[];
}

/**
 * A band of light that crosses a button every few seconds (`[data-sweep]`). It sits inside the
 * button, which clips it, and takes no touch. Where nothing may move there is no band at all.
 */
export function Sweep({ colors }: SweepProps) {
  const { reducedMotion } = useScreenStyle();
  const at = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    at.value = withRepeat(
      withSequence(
        withTiming(1, { duration: ACROSS_MS, easing: Easing.bezier(0.5, 0, 0.3, 1) }),
        withDelay(WAIT_MS, withTiming(0, { duration: 0 })),
      ),
      -1,
    );
  }, [reducedMotion, at]);
  const style = useAnimatedStyle(() => ({
    left: `${-40 + at.value * 160}%`,
  }));
  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Animated.View style={[styles.band, style]}>
        {colors.map((color, index) => (
          <View key={index} style={[styles.stripe, { backgroundColor: color }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', borderRadius: 28 },
  band: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: '36%',
    flexDirection: 'row',
    transform: [{ skewX: '-20deg' }],
  },
  stripe: { flex: 1 },
});
