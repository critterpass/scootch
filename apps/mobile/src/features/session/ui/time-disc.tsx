import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { discScale } from '../session-view';

import type { SessionInks } from './session-inks';

/** The disc at full time, as a share of the ring it sits in. */
const FULL_DISC = 0.86;

export interface TimeDiscProps {
  /** How much time is left, from 1 down to 0. */
  readonly fraction: number;
  /** A serious task's disc is ink-grey. */
  readonly quiet: boolean;
  readonly size: number;
  readonly inks: SessionInks;
  readonly reducedMotion: boolean;
  /** "7 minutes left", read by VoiceOver in place of the drawing. */
  readonly spokenLabel: string;
  readonly hint: string;
}

/**
 * Time as a shrinking disc inside a fixed ring, readable from across a desk: the disc's area is
 * the time left. It glides between ticks; with Reduce Motion it steps.
 */
export function TimeDisc({
  fraction,
  quiet,
  size,
  inks,
  reducedMotion,
  spokenLabel,
  hint,
}: TimeDiscProps) {
  const target = discScale(fraction);
  const scale = useSharedValue(target);

  useEffect(() => {
    scale.value = reducedMotion
      ? target
      : withTiming(target, { duration: 900, easing: Easing.linear });
  }, [target, reducedMotion, scale]);

  const disc = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inner = size * FULL_DISC;

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={spokenLabel}
      accessibilityHint={hint}
      testID="session-disc"
      style={[styles.ring, { width: size, height: size, borderColor: inks.track }]}
    >
      <Animated.View
        style={[
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: quiet ? inks.quietDisc : inks.tomato,
          },
          disc,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
