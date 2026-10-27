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
const LAST = BAR_HEIGHTS.length - 1;
/** The board's `wave`: one rise and fall every 900 ms. */
const WAVE_MS = 900;
/** Where nothing is measured (a drawn state), the bars move as for a steady voice. */
const STEADY = 0.6;

function Bar({
  clock,
  level,
  height,
  phase,
  weight,
  still,
}: {
  readonly clock: SharedValue<number>;
  readonly level: SharedValue<number> | undefined;
  readonly height: number;
  readonly phase: number;
  /** How much of the voice this bar takes: the middle of the row the most. */
  readonly weight: number;
  readonly still: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const loud = level === undefined ? STEADY : level.get();
    // Where nothing may move the bars stand at their full heights, as the board's do; the voice
    // shows only in how strongly they are drawn.
    if (still) return { opacity: 0.45 + 0.55 * loud, transform: [{ scaleY: 1 }] };
    const t = (clock.get() + phase) % 1;
    const wave = 0.5 - 0.5 * Math.cos(t * 2 * Math.PI);
    // Quiet, the row only breathes; speaking, each bar rises with the voice and keeps its wave.
    const lift = 0.12 * wave + 0.88 * loud * weight * (0.45 + 0.55 * wave);
    return { opacity: 1, transform: [{ scaleY: 0.22 + 0.78 * Math.min(1, lift) }] };
  });
  return <Animated.View style={[styles.bar, { height: `${height}%` }, style]} />;
}

/**
 * The voice, as the board draws it: two dozen red bars. They rise and fall with how loud the voice
 * is (`level`, 0 to 1), each on its own wave, and only breathe while it is quiet.
 */
export function VoiceBars({ level }: { readonly level?: SharedValue<number> }) {
  const mayMove = useMayMove();
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!mayMove) return undefined;
    clock.set(withRepeat(withTiming(1, { duration: WAVE_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [mayMove, clock]);
  return (
    <View
      style={styles.bars}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BAR_HEIGHTS.map((height, i) => (
        <Bar
          key={i}
          clock={clock}
          level={level}
          height={height}
          phase={((i * 137) % WAVE_MS) / WAVE_MS}
          weight={0.7 + 0.3 * Math.sin((Math.PI * i) / LAST)}
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
