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

import { Look, lookOf, placed } from './burst-looks';
import { bloomFrame, markFrame } from './burst-motion';
import {
  BURST_MS,
  burstSources,
  stillMarks,
  type BurstBloom,
  type BurstInks,
  type BurstMark,
} from './burst-shapes';
import type { SessionInks } from './session-inks';

function Mark({ mark, clock }: { readonly mark: BurstMark; readonly clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => markFrame(mark, clock.value - mark.delay));
  return (
    <Animated.View style={[styles.mark, placed(mark), lookOf(mark), style]}>
      <Look mark={mark} />
    </Animated.View>
  );
}

function Bloom({
  bloom,
  clock,
}: {
  readonly bloom: BurstBloom;
  readonly clock: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => bloomFrame(bloom, clock.value));
  const half = bloom.size / 2;
  return (
    <Animated.View
      style={[
        styles.mark,
        {
          width: bloom.size,
          height: bloom.size,
          borderRadius: half,
          marginLeft: -half,
          marginTop: -half,
          backgroundImage: `radial-gradient(circle at 50% 50%, ${bloom.color} 0%, ${bloom.color}66 30%, ${bloom.color}00 70%)`,
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
 * The burst: marks thrown out once from each of its points, with one soft flash where the first
 * throw goes off (the start goes from the Start button and then from up the screen). Paper
 * tumbles and sways as it falls; a paid trail is made of gold, soap or ink and moves like it.
 * With Reduce Motion nothing flies: a soft glow comes up with a few still marks and fades. It
 * never takes a touch.
 */
export function BurstMarks(props: BurstMarksProps) {
  const { kind, inks, reducedMotion, controlAt } = props;
  const clock = useSharedValue(0);
  const glow = useSharedValue(0);
  const worn = usePlusState().look.trail;
  const trail = kind === 'start' ? 'confetti' : (props.trail ?? worn);

  useEffect(() => {
    if (reducedMotion) {
      glow.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      );
    } else {
      clock.value = withTiming(BURST_MS, { duration: BURST_MS, easing: Easing.linear });
    }
  }, [reducedMotion, clock, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.28 }));
  const stillStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const printed = useMemo(
    (): BurstInks => ({ ink: inks.ink, tomato: inks.tomato, page: inks.page, dark: inks.dark }),
    [inks],
  );
  const sources = useMemo(
    () => (reducedMotion ? [] : burstSources(kind, printed, trail)),
    [kind, printed, trail, reducedMotion],
  );
  const stills = useMemo(
    () => (reducedMotion ? stillMarks(printed, trail) : []),
    [printed, trail, reducedMotion],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`session-burst-${kind}`}>
      {reducedMotion ? (
        <View style={[styles.origin, at([0.5, 0.36])]}>
          <Animated.View
            style={[styles.mark, styles.glow, { backgroundColor: inks.tomato }, glowStyle]}
          />
          <Animated.View style={[styles.mark, stillStyle]}>
            {stills.map(({ mark, x, y }, index) => (
              <View
                key={index}
                style={[
                  styles.mark,
                  placed(mark),
                  lookOf(mark),
                  {
                    left: x,
                    top: y,
                    opacity: mark.opacity,
                    transform: [{ rotate: `${mark.rotation}rad` }, { scale: mark.scale }],
                  },
                ]}
              >
                <Look mark={mark} />
              </View>
            ))}
          </Animated.View>
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
            {source.bloom ? <Bloom bloom={source.bloom} clock={clock} /> : null}
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
