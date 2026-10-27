import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { HAND_FAMILY } from '../../classroom/use-hand-font';

/** The Splash board's timeline, in milliseconds. */
export const AT = {
  write: 260,
  writeMs: 760,
  line: 980,
  lineMs: 420,
  rise: 1160,
  riseMs: 620,
  drums: [1820, 2080, 2340],
  drumMs: 620,
  fly: 2980,
  flyMs: 760,
  fadeMs: 900,
  end: 3900,
} as const;
const bezier = (a: number, b: number, c: number, d: number) => Easing.bezier(a, b, c, d);
/** The Splash board's curves: interface, character, camera, and the chalk's writing. */
export const SPLASH_CURVES = {
  INTERFACE: bezier(0.32, 0.72, 0, 1),
  CHARACTER: bezier(0.34, 1.56, 0.64, 1),
  CAMERA: bezier(0.7, 0, 0.2, 1),
  WRITE: bezier(0.45, 0.05, 0.4, 1),
} as const;
const { CHARACTER } = SPLASH_CURVES;

/** A drum word, as the board's `spTung`: pops to 1.15, settles to 1, then fades as it lifts. */
export function Drum({ at, style, size, play }: DrumProps) {
  const shown = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    // Three stretches of 35%, 25% and 40%, each on the character curve as the keyframes run.
    const step = (to: number, share: number) =>
      withTiming(to, { duration: AT.drumMs * share, easing: CHARACTER });
    shown.set(withDelay(at, withSequence(step(1, 0.35), step(2, 0.25), step(3, 0.4))));
  }, [at, play, shown]);
  const animated = useAnimatedStyle(() => {
    const v = shown.get();
    return {
      opacity: v <= 1 ? Math.max(0, v) : 1 - Math.max(0, v - 1) / 2,
      transform: [
        { translateY: v > 2 ? -14 * (v - 2) : 0 },
        { scale: v <= 1 ? 0.4 + 0.75 * v : v <= 2 ? 1.15 - 0.15 * (v - 1) : 1 },
        { rotate: style.rotate },
      ],
    };
  });
  return (
    <Animated.Text
      style={[styles.drum, { fontSize: size, left: style.left, top: style.top }, animated]}
    >
      Tùng!
    </Animated.Text>
  );
}

interface DrumProps {
  readonly at: number;
  readonly size: number;
  readonly play: boolean;
  readonly style: { readonly left: number; readonly top: number; readonly rotate: string };
}

/** The board's `spShakeA`, once a stroke: 260 ms ease-out, a nudge left and right with a tilt. */
const SHAKE_X = [0, -4, 3, -2, 0];
const SHAKE_DEG = [0, -0.6, 0.4, 0, 0];
const SHAKE_STEPS = [52, 65, 65, 78];
const EASE_OUT = bezier(0, 0, 0.58, 1);

export function useBoardShake(play: boolean): SharedValue<number> {
  // Runs through the keyframes 0 to 4 once a stroke; `shakeStyle` reads it.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    const once = () =>
      withSequence(
        withTiming(0, { duration: 0 }),
        ...SHAKE_STEPS.map((duration, i) => withTiming(i + 1, { duration, easing: EASE_OUT })),
      );
    shake.set(withDelay(AT.drums[0], withSequence(once(), once(), once())));
  }, [play, shake]);
  return shake;
}

export function shakeStyle(k: number) {
  'worklet';
  return {
    transform: [
      { translateX: interpolate(k, [0, 1, 2, 3, 4], SHAKE_X) },
      { rotate: `${interpolate(k, [0, 1, 2, 3, 4], SHAKE_DEG)}deg` },
    ],
  };
}

const styles = StyleSheet.create({
  drum: {
    position: 'absolute',
    fontFamily: HAND_FAMILY,
    color: '#D42A24',
    textShadowColor: '#FFFFFF',
    textShadowRadius: 2,
    textShadowOffset: { width: 2, height: 2 },
  },
});
