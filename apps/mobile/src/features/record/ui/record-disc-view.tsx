import { useEffect, useMemo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { MonsterSpec } from '@scootch/domain';

import { CommandCanvas } from '../../reveal/ui/command-canvas';
import {
  ARM_REST_DEG,
  ARM_SWING_MS,
  SPIN_DOWN_MS,
  SPIN_TURN_MS,
  SPIN_UP_MS,
} from '../record-audio';
import { DISC_SPACE, recordDiscCommands } from '../record-disc';

/** A style that is animated: what `useAnimatedStyle` gives. */
type Arriving = ComponentProps<typeof Animated.View>['style'];

export interface RecordDiscViewProps {
  readonly size: number;
  readonly barCount: number;
  readonly cover: readonly MonsterSpec[];
  readonly playing: boolean;
  /** Where the arm points while playing, in degrees. */
  readonly armDeg: number;
  readonly reducedMotion: boolean;
  /** How the record lies as it arrives: tipped, turned, part way there. Unset, it lies flat. */
  readonly lying?: Arriving;
  /** How the arm arrives, after the record. Unset, it is simply there. */
  readonly armArriving?: Arriving;
}

const SPACE = { width: DISC_SPACE, height: DISC_SPACE };
const ARM_EASE = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * The record on its deck. Playing drops the needle and spins the record up; stopping lifts the
 * arm and lets the record run down. With Reduce Motion the record stays still and only the arm
 * shows that it is playing.
 */
export function RecordDiscView(props: RecordDiscViewProps) {
  const { size, barCount, cover, playing, armDeg, reducedMotion, lying, armArriving } = props;
  const commands = useMemo(() => recordDiscCommands(barCount, cover), [barCount, cover]);
  const turn = useSharedValue(0);
  const arm = useSharedValue(ARM_REST_DEG);

  useEffect(() => {
    if (reducedMotion) return;
    cancelAnimation(turn);
    const from = turn.value % 360;
    turn.value = from;
    turn.value = playing
      ? withSequence(
          withTiming(from + 70, { duration: SPIN_UP_MS, easing: Easing.in(Easing.cubic) }),
          withRepeat(
            withTiming(from + 430, { duration: SPIN_TURN_MS, easing: Easing.linear }),
            -1,
            false,
          ),
        )
      : withTiming(from + 110, { duration: SPIN_DOWN_MS, easing: Easing.out(Easing.cubic) });
  }, [playing, reducedMotion, turn]);

  useEffect(() => {
    const target = playing ? armDeg : ARM_REST_DEG;
    arm.value = reducedMotion
      ? target
      : withTiming(target, { duration: ARM_SWING_MS, easing: ARM_EASE });
  }, [playing, armDeg, reducedMotion, arm]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const armStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${arm.value}deg` }] }));

  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no">
      <Animated.View style={lying}>
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            { top: size * 0.04, left: size * 0.04, width: size * 0.92, height: size * 0.92 },
            { borderRadius: size * 0.46 },
          ]}
        />
        <Animated.View style={spinStyle}>
          <CommandCanvas commands={commands} space={SPACE} width={size} />
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[styles.armPlace, { height: size * 0.62, right: size * 0.06 }, armArriving]}
      >
        <Animated.View style={[styles.arm, { transformOrigin: 'top' }, armStyle]}>
          <View style={styles.pivot} />
          <View style={styles.rod} />
          <View style={styles.head} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The record's own shadow on the deck, under the vinyl: it does not turn with it.
  shadow: { position: 'absolute', boxShadow: '0 24px 40px -14px rgba(28,26,23,0.55)' },
  armPlace: { position: 'absolute', top: 0, width: 24 },
  arm: { flex: 1, alignItems: 'center' },
  pivot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#D9D2C6' },
  rod: { flex: 1, width: 5, borderRadius: 2.5, backgroundColor: '#CFC7BA' },
  head: { width: 14, height: 22, borderRadius: 4, backgroundColor: '#1C1A17' },
});
