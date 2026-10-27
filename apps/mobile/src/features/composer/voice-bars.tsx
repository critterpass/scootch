import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMayMove } from '../../ui/motion/use-feel';
import { ink } from '../desk/class-style';

const BAR_HEIGHTS = [
  40, 70, 55, 90, 65, 100, 45, 80, 60, 95, 50, 75, 85, 40, 70, 100, 55, 65, 90, 45, 80, 60, 70, 50,
];

function Bar({
  clock,
  height,
  phase,
  still,
}: {
  clock: SharedValue<number>;
  height: number;
  phase: number;
  still: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // Where nothing may move the bars stand at their full heights, as the board's do.
    if (still) return { transform: [{ scaleY: 1 }] };
    const t = (clock.get() + phase) % 1;
    return { transform: [{ scaleY: 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI)) }] };
  });
  return <Animated.View style={[styles.bar, { height: `${height}%` }, style]} />;
}

/** The voice level, as the board draws it: two dozen red bars that never stop while it listens. */
export function VoiceBars() {
  const mayMove = useMayMove();
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!mayMove) return undefined;
    clock.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [mayMove, clock]);
  return (
    <View style={styles.bars}>
      {BAR_HEIGHTS.map((height, i) => (
        <Bar
          key={i}
          clock={clock}
          height={height}
          phase={((i * 137) % 900) / 900}
          still={!mayMove}
        />
      ))}
    </View>
  );
}

/** The red dot beside "Listening", blinking once a second as the board's `dot` does. */
export function ListeningDot() {
  const mayMove = useMayMove();
  const shown = useSharedValue(1);
  useEffect(() => {
    if (!mayMove) return undefined;
    const half = { duration: 500, easing: Easing.bezier(0.42, 0, 0.58, 1) };
    shown.set(withRepeat(withSequence(withTiming(0.3, half), withTiming(1, half)), -1));
    return () => cancelAnimation(shown);
  }, [mayMove, shown]);
  const blink = useAnimatedStyle(() => ({ opacity: shown.get() }));
  return <Animated.View style={[styles.dot, blink]} />;
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22 },
  bar: { width: 3, borderRadius: 2, backgroundColor: ink.red },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ink.red },
});
