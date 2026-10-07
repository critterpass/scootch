import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { usePlusState } from '../../../state/plus-context';
import type { TrailId } from '../../studio/catalogue';

import { BURST_MS, burstSources, type BurstMark, type BurstRing } from './burst-shapes';
import type { SessionInks } from './session-inks';

/** What each kind of mark adds to its plain shape. */
const MADE_OF = {
  paper: null,
  gold: { boxShadow: '0 0 12px rgba(255,200,80,0.95)' },
  bubble: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)' },
  blot: null,
} as const;

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
          borderRadius: (mark.made === 'paper' ? mark.height : mark.width) / 2,
          backgroundColor: mark.color,
          ...MADE_OF[mark.made],
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
  readonly kind: 'start' | 'confetti' | 'catch';
  /** The centre of the control that set the burst off, in points from the screen's top left. */
  readonly controlAt?: { readonly x: number; readonly y: number } | null;
  readonly inks: SessionInks;
  readonly reducedMotion: boolean;
  /** The trail to throw. Left out, it is the one the person wears. */
  readonly trail?: TrailId;
}

const at = ([across, down]: readonly [number, number]) =>
  ({ left: `${across * 100}%`, top: `${down * 100}%` }) as const;

/**
 * The burst: marks thrown out with rings behind them, once, from each of its points (the start
 * goes from the Start button and then from up the screen, as the board fires it). With Reduce
 * Motion nothing flies: a soft glow comes up and fades. It never takes a touch.
 */
export function BurstMarks(props: BurstMarksProps) {
  const { kind, inks, reducedMotion, controlAt } = props;
  const clock = useSharedValue(0);
  const glow = useSharedValue(0);
  const worn = usePlusState().look.trail;
  const trail = props.trail ?? worn;

  useEffect(() => {
    if (reducedMotion) {
      glow.value = withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 900 }));
    } else {
      clock.value = withTiming(BURST_MS, { duration: BURST_MS, easing: Easing.linear });
    }
  }, [reducedMotion, clock, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.28 }));
  const sources = useMemo(
    () =>
      burstSources(
        kind,
        [inks.tomato, inks.ink, inks.tomato, inks.risoBlob],
        [inks.tomato, inks.ink],
        trail,
      ),
    [kind, inks, trail],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`session-burst-${kind}`}>
      {reducedMotion ? (
        <View style={[styles.origin, at([0.5, 0.36])]}>
          <Animated.View
            style={[styles.mark, styles.glow, { backgroundColor: inks.tomato }, glowStyle]}
          />
        </View>
      ) : (
        sources.map((source) => (
          <View
            key={source.id}
            style={[
              styles.origin,
              source.fromControl && controlAt
                ? { left: controlAt.x, top: controlAt.y }
                : at(source.at),
            ]}
          >
            {source.rings.map((ring) => (
              <Ring key={ring.id} ring={ring} clock={clock} />
            ))}
            {source.marks.map((mark) => (
              <Mark key={mark.id} mark={mark} clock={clock} />
            ))}
          </View>
        ))
      )}
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
