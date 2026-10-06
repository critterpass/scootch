import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BURST_MS, burstMarks, burstRings, type BurstMark, type BurstRing } from './burst-shapes';
import type { SessionInks } from './session-inks';

function Mark({ mark, clock }: { readonly mark: BurstMark; readonly clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const k = (clock.value - mark.delay) / mark.life;
    if (k <= 0 || k >= 1) return { opacity: 0 };
    const eased = 1 - Math.pow(1 - k, 3);
    return {
      opacity: k > 0.7 ? (1 - k) / 0.3 : 1,
      transform: [
        { translateX: mark.vx * eased },
        { translateY: mark.vy * eased + mark.gravity * k * k },
        { rotate: `${mark.rotation + k * mark.spin}rad` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.mark,
        {
          width: mark.width,
          height: mark.height,
          borderRadius: mark.height / 2,
          backgroundColor: mark.color,
          marginLeft: -mark.width / 2,
          marginTop: -mark.height / 2,
        },
        style,
      ]}
    />
  );
}

function Ring({ ring, clock }: { readonly ring: BurstRing; readonly clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const k = (clock.value - ring.delay) / ring.life;
    if (k <= 0 || k >= 1) return { opacity: 0 };
    const eased = 1 - Math.pow(1 - k, 3);
    const radius = ring.from + (ring.to - ring.from) * eased;
    return { opacity: 1 - k, transform: [{ scale: radius / ring.to }] };
  });
  const size = ring.to * 2;
  return (
    <Animated.View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: ring.to,
          borderWidth: 4,
          borderColor: ring.color,
          marginLeft: -ring.to,
          marginTop: -ring.to,
        },
        style,
      ]}
    />
  );
}

export interface BurstMarksProps {
  readonly kind: 'start' | 'confetti';
  readonly inks: SessionInks;
  readonly reducedMotion: boolean;
  /** Where the burst opens, as shares of the screen: across, then down. */
  readonly origin?: readonly [number, number];
}

/**
 * The burst: marks thrown out from one point with two rings behind them, once. With Reduce Motion
 * nothing flies: a soft glow comes up and fades. It never takes a touch.
 */
export function BurstMarks({ kind, inks, reducedMotion, origin = [0.5, 0.36] }: BurstMarksProps) {
  const clock = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      glow.value = withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 900 }));
    } else {
      clock.value = withTiming(BURST_MS, { duration: BURST_MS, easing: Easing.linear });
    }
  }, [reducedMotion, clock, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.28 }));
  const at = { left: `${origin[0] * 100}%`, top: `${origin[1] * 100}%` } as const;
  const paper = inks.risoBlob;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`session-burst-${kind}`}>
      <View style={[styles.origin, at]}>
        {reducedMotion ? (
          <Animated.View
            style={[styles.mark, styles.glow, { backgroundColor: inks.tomato }, glowStyle]}
          />
        ) : (
          <>
            {burstRings(kind, [inks.tomato, inks.ink]).map((ring) => (
              <Ring key={ring.id} ring={ring} clock={clock} />
            ))}
            {burstMarks(kind, [inks.tomato, inks.ink, inks.tomato, paper]).map((mark) => (
              <Mark key={mark.id} mark={mark} clock={clock} />
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  mark: {
    position: 'absolute',
  },
  glow: {
    width: 280,
    height: 280,
    borderRadius: 140,
    marginLeft: -140,
    marginTop: -140,
  },
});
