import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { css, useEased } from './class-motion';
import { ink } from './class-style';

/** The drum's swing when it sounds, as the App board's `ring` keyframes: 520 ms. */
function ringSequence(to: (step: number) => number) {
  const steps = [
    { at: 0.15, v: to(1) },
    { at: 0.35, v: to(2) },
    { at: 0.55, v: to(3) },
    { at: 0.75, v: to(4) },
    { at: 1, v: to(5) },
  ];
  let last = 0;
  return withSequence(
    ...steps.map(({ at, v }) => {
      const duration = (at - last) * 520;
      last = at;
      return withTiming(v, { duration, easing: css.easeInOut });
    }),
  );
}
const TURNS = [0, 16, -14, 10, -6, 0] as const;
const SIZES = [1, 1.15, 1, 1.1, 1, 1] as const;

/**
 * The drum icon on Start: a thin ring with a pie inside that empties as the fuse burns. The pie
 * burns yellow from pressure 4. When the drum sounds, it swings.
 */
export function StartDrum({
  left,
  hasFuse,
  hot,
  ringing,
  mayMove,
}: {
  /** Share of the fuse left, 1 to 0, burning smoothly between the store's readings. */
  readonly left: SharedValue<number>;
  readonly hasFuse: boolean;
  readonly hot: boolean;
  readonly ringing: boolean;
  readonly mayMove: boolean;
}) {
  const turn = useSharedValue(0);
  const size = useSharedValue(1);
  useEffect(() => {
    turn.set(0);
    size.set(1);
    if (!ringing || !mayMove) return;
    turn.set(ringSequence((step) => TURNS[step] ?? 0));
    size.set(ringSequence((step) => SIZES[step] ?? 1));
  }, [ringing, mayMove, turn, size]);
  // The pie turns yellow from pressure 4 over 300 ms, as the board's stroke transition.
  const heat = useEased(hot, 300, mayMove);
  const pie = useDerivedValue(() => interpolateColor(heat.get(), [0, 1], [ink.white, '#FFE29A']));
  const swing = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get()}deg` }, { scale: size.get() }],
  }));

  return (
    <Animated.View style={[styles.drum, swing]} pointerEvents="none">
      <Canvas style={styles.drum}>
        <Circle
          cx={11}
          cy={11}
          r={9.5}
          style="stroke"
          strokeWidth={2}
          color="rgba(255,255,255,0.4)"
        />
        {hasFuse ? (
          <Path
            path="M 11 7.5 A 3.5 3.5 0 1 1 10.99 7.5"
            style="stroke"
            strokeWidth={7}
            color={pie}
            start={0}
            end={left}
          />
        ) : (
          <Circle cx={11} cy={11} r={7} color={ink.white} />
        )}
      </Canvas>
    </Animated.View>
  );
}

/**
 * The ripple across Start as the drum sounds: a soft white circle from its middle, gone in 560 ms.
 * Clipped to the button. Nothing ripples where nothing may move.
 */
export function StartRipple({
  ringing,
  mayMove,
}: {
  readonly ringing: boolean;
  readonly mayMove: boolean;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(0);
    if (ringing && mayMove) p.set(withTiming(1, { duration: 560, easing: css.easeOut }));
  }, [ringing, mayMove, p]);
  const grow = useAnimatedStyle(() => ({
    opacity: p.get() === 0 ? 0 : 1 - p.get(),
    transform: [{ scale: 7 * p.get() }],
  }));
  if (!ringing || !mayMove) return null;
  return (
    <View style={styles.clip} pointerEvents="none">
      <Animated.View style={[styles.ripple, grow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  drum: { width: 22, height: 22 },
  clip: { position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden' },
  ripple: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
