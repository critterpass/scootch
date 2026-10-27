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

/**
 * The board's `tung` keyframes over 700 ms: in by 35%, held to 75%, gone at the end. CSS eases every
 * segment on the character curve, so each value overshoots its own keyframe and settles back.
 */
const TUNG_MS = 700;
const TUNG = {
  opacity: [0, 1, 1, 0],
  scale: [0.4, 1.15, 1, 1.05],
  turn: [-12, -6, -6, -6],
  rise: [0, 0, 0, -10],
} as const;

function tung(values: readonly [number, number, number, number], delay: number) {
  const step = (to: number, share: number) =>
    withTiming(to, { duration: TUNG_MS * share, easing: curves.character });
  return withDelay(
    delay,
    withSequence(step(values[1], 0.35), step(values[2], 0.4), step(values[3], 0.25)),
  );
}

function Stroke({ x, y, delay, size, k }: (typeof STROKES)[number] & { k: number }) {
  const t = useT();
  const opacity = useSharedValue<number>(TUNG.opacity[0]);
  const scale = useSharedValue<number>(TUNG.scale[0]);
  const turn = useSharedValue<number>(TUNG.turn[0]);
  const rise = useSharedValue<number>(TUNG.rise[0]);
  useEffect(() => {
    opacity.set(tung(TUNG.opacity, delay));
    scale.set(tung(TUNG.scale, delay));
    turn.set(tung(TUNG.turn, delay));
    rise.set(tung(TUNG.rise, delay));
  }, [opacity, scale, turn, rise, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, opacity.get())),
    transform: [{ translateY: rise.get() }, { scale: scale.get() }, { rotate: `${turn.get()}deg` }],
  }));
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
 * begins and ends. Under Reduce Motion nothing shows: only the drum is heard.
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
