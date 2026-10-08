import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { MonsterSpec } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { Monster } from '../../../art/Monster';
import { SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import { SPIN_DOWN_MS, SPIN_TURN_MS, SPIN_UP_MS } from '../record-audio';
import { DISC_SPACE, recordDiscCommands } from '../record-disc';

/** The colours a sleeve is printed in, turned through week by week. */
const SLEEVES = ['#F0562E', '#2F5D8C', '#3F8F7B', '#C9921A', '#7A5BA8', '#C96A8B'] as const;
/** The record against its sleeve: its size, how much shows at rest, and how far it comes out. */
const DISC = { share: 0.92, restOut: 0.36, playOut: 0.68 } as const;
const SLIDE_MS = 520;
const ALWAYS = ReduceMotion.Never;
const SPACE = { width: DISC_SPACE, height: DISC_SPACE };

/** How wide a sleeve of this side stands with its record all the way out. */
export function sleeveStage(side: number): number {
  return Math.round(side + side * DISC.share * DISC.playOut);
}

export interface RecordSleeveProps {
  /** The sleeve's side, in points. */
  readonly side: number;
  readonly weekNumber: number;
  /** "WEEK 41", printed in the sleeve's corner. */
  readonly label: string;
  readonly barCount: number;
  /** The monsters that played that week: the first stands on the sleeve, all are on the label. */
  readonly cover: readonly MonsterSpec[];
  readonly playing: boolean;
  readonly reducedMotion: boolean;
}

/**
 * One kept record in its sleeve. The sleeve is printed in its week's colour with the week's
 * first monster on it; the record peeks out of the open side. While it plays the record slides
 * out and spins up, and when it stops it runs down and slides home. Where nothing may move it is
 * simply out, or in.
 */
export function RecordSleeve(props: RecordSleeveProps) {
  const { side, weekNumber, barCount, cover, playing, reducedMotion } = props;
  const disc = Math.round(side * DISC.share);
  const commands = useMemo(() => recordDiscCommands(barCount, cover), [barCount, cover]);
  const out = useSharedValue(playing ? 1 : 0);
  const turn = useSharedValue(0);

  useEffect(() => {
    out.value = reducedMotion
      ? Number(playing)
      : withTiming(Number(playing), {
          duration: SLIDE_MS,
          easing: SPRING_CURVE,
          reduceMotion: ALWAYS,
        });
  }, [playing, reducedMotion, out]);
  useEffect(() => {
    if (reducedMotion) return;
    cancelAnimation(turn);
    const from = turn.value % 360;
    turn.value = from;
    turn.value = playing
      ? withSequence(
          withTiming(from + 70, {
            duration: SPIN_UP_MS,
            easing: Easing.in(Easing.cubic),
            reduceMotion: ALWAYS,
          }),
          withRepeat(
            withTiming(from + 430, {
              duration: SPIN_TURN_MS,
              easing: Easing.linear,
              reduceMotion: ALWAYS,
            }),
            -1,
            false,
          ),
        )
      : withTiming(from + 110, {
          duration: SPIN_DOWN_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ALWAYS,
        });
  }, [playing, reducedMotion, turn]);

  const sliding = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: side - disc + disc * (DISC.restOut + (DISC.playOut - DISC.restOut) * out.value),
      },
    ],
  }));
  const spinning = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const colour = SLEEVES[weekNumber % SLEEVES.length] ?? SLEEVES[0];
  const [front] = cover;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: sleeveStage(side), height: side }}
    >
      <Animated.View style={[styles.disc, { top: (side - disc) / 2 }, sliding]}>
        <Animated.View style={spinning}>
          <CommandCanvas commands={commands} space={SPACE} width={disc} />
        </Animated.View>
      </Animated.View>
      <View style={[styles.sleeve, { width: side, height: side, backgroundColor: colour }]}>
        {front ? (
          <View style={styles.front}>
            <Monster spec={front} idle={false} reducedMotion size={Math.round(side * 0.74)} />
          </View>
        ) : (
          <Text allowFontScaling={false} style={[styles.numeral, { fontSize: side * 0.46 }]}>
            {weekNumber}
          </Text>
        )}
        <Text allowFontScaling={false} numberOfLines={1} style={styles.label}>
          {props.label.toLocaleUpperCase()}
        </Text>
        {/* The open side, where the record goes in. */}
        <View style={styles.mouth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { position: 'absolute', left: 0 },
  sleeve: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    boxShadow: '0 10px 18px -10px rgba(28,26,23,0.5)',
  },
  front: { marginBottom: 2 },
  numeral: {
    position: 'absolute',
    bottom: 4,
    color: '#FFFFFF',
    fontFamily: fonts.heading,
    fontWeight: '900',
    letterSpacing: -1,
  },
  label: {
    position: 'absolute',
    top: 8,
    left: 9,
    right: 12,
    color: '#FFFFFF',
    opacity: 0.92,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 8,
    letterSpacing: 1.1,
  },
  mouth: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(28,26,23,0.22)',
  },
});
