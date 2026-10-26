import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useMayMove } from '../../ui/motion/use-feel';
import { curves, ink, type } from '../desk/class-style';

/** The three strokes as the App board places them on a 390-point phone. */
const STROKES = [
  { x: 22, y: 318, delay: 0, size: 30 },
  { x: 268, y: 300, delay: 160, size: 30 },
  { x: 150, y: 250, delay: 320, size: 36 },
] as const;

function Stroke({ x, y, delay, size, k }: (typeof STROKES)[number] & { k: number }) {
  const t = useT();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(
        delay,
        withSequence(
          withTiming(0.35, { duration: 245, easing: curves.character }),
          withTiming(0.75, { duration: 280 }),
          withTiming(1, { duration: 175 }),
        ),
      ),
    );
  }, [p, delay]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    const scale =
      v < 0.35
        ? 0.4 + (1.15 - 0.4) * (v / 0.35)
        : v < 0.75
          ? 1.15 - 0.15 * ((v - 0.35) / 0.4)
          : 1 + 0.05 * ((v - 0.75) / 0.25);
    return {
      opacity: v === 0 ? 0 : v < 0.35 ? v / 0.35 : v < 0.75 ? 1 : 1 - (v - 0.75) / 0.25,
      transform: [
        { translateY: v > 0.75 ? -10 * ((v - 0.75) / 0.25) : 0 },
        { scale },
        { rotate: '-6deg' },
      ],
    };
  });
  return (
    <Animated.Text
      style={[type.hand, styles.tung, { left: x * k, top: y * k, fontSize: size }, style]}
    >
      {t('session.drum')}
    </Animated.Text>
  );
}

/**
 * The school drum: "Tùng! Tùng! Tùng!" in red chalk, one stroke after another, as the period
 * begins and ends. Under Reduce Motion the words show still, for as long as the drum sounds.
 */
export function DrumBurst() {
  const mayMove = useMayMove();
  const { width } = useWindowDimensions();
  const k = width / 390;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      testID="drum"
    >
      {mayMove ? STROKES.map((stroke) => <Stroke key={stroke.x} {...stroke} k={k} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tung: {
    position: 'absolute',
    color: ink.red,
    textShadowColor: ink.white,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
});
