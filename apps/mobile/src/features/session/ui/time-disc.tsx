import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMayMove } from '../../../ui/motion/use-feel';
import { discShare } from '../session-view';

import type { SessionInks } from './session-inks';

/** The ring as the board draws it, in points. Everything inside is a share of it. */
export const RING_SIZE = 330;
/** The ring of a serious task, and of the session while the stuck card is up. */
export const SMALL_RING_SIZE = 280;
const RING_LINE = 1.5;
/** The disc's soft pulse: a ring of its own colour that spreads this far as it fades. */
const PULSE = { spread: 22, ms: 3200, opacity: 0.32 } as const;
/** How far Scootch sits below the ring's centre, as a share of the disc under him. */
const SITS_LOW = 0.05;
const LIT_EDGE = 2;
const NEVER = ReduceMotion.Never;

export interface TimeDiscProps {
  /** How much time is left, from 1 down to 0. */
  readonly fraction: number;
  /** A serious task's disc is ink-grey and does not pulse. */
  readonly quiet: boolean;
  /** The ring's width and height in points. */
  readonly size: number;
  readonly inks: SessionInks;
  readonly reducedMotion: boolean;
  /** "7 minutes left", read by VoiceOver in place of the drawing. */
  readonly spokenLabel: string;
  readonly hint: string;
  /** Scootch, who sits on the disc. */
  readonly children?: ReactNode;
}

/**
 * Time as a shrinking disc inside a fixed ring, readable from across a desk, with Scootch sitting
 * on it. The disc's width follows the time left in a straight line, as the board draws it. It
 * glides between ticks and breathes a soft pulse; where nothing may move it steps and is still.
 */
export function TimeDisc({
  fraction,
  quiet,
  size,
  inks,
  reducedMotion,
  spokenLabel,
  hint,
  children,
}: TimeDiscProps) {
  const mayMove = useMayMove() && !reducedMotion;
  // Everything that moves is a scale or an opacity of a ring-sized circle, on the UI thread: no
  // layout is redone as the disc shrinks or pulses.
  const target = discShare(fraction);
  const share = useSharedValue(target);
  const pulse = useSharedValue(0);

  useEffect(() => {
    share.value = mayMove
      ? withTiming(target, { duration: 900, easing: Easing.linear, reduceMotion: NEVER })
      : target;
  }, [target, mayMove, share]);

  const pulsing = mayMove && !quiet;
  useEffect(() => {
    if (!pulsing) {
      pulse.value = 0;
      return undefined;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: PULSE.ms, easing: Easing.out(Easing.quad), reduceMotion: NEVER }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulsing, pulse]);

  const disc = useAnimatedStyle(() => ({ transform: [{ scale: share.value }] }));
  // The lit edge stays two points deep however small the disc is drawn.
  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: LIT_EDGE / Math.max(share.value, 0.05) }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : PULSE.opacity * (1 - pulse.value),
    transform: [{ scale: share.value + (PULSE.spread * 2 * pulse.value) / size }],
  }));
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={spokenLabel}
      accessibilityHint={hint}
      testID="session-disc"
      style={{ width: size, height: size }}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, borderWidth: RING_LINE, borderColor: inks.ringLine },
        ]}
      />
      {pulsing ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centred]}>
          <Animated.View style={[circle, { backgroundColor: inks.tomato }, halo]} />
        </View>
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centred]}>
        <Animated.View
          style={[
            styles.disc,
            circle,
            { backgroundColor: quiet ? inks.quietDisc : inks.tomato },
            disc,
          ]}
        >
          {quiet ? null : (
            <>
              {/* The lit top edge: two points of the disc's own colour, lightened. */}
              <View style={[StyleSheet.absoluteFill, styles.lit]} />
              <Animated.View
                style={[StyleSheet.absoluteFill, circle, { backgroundColor: inks.tomato }, body]}
              />
            </>
          )}
        </Animated.View>
      </View>
      {children ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.centred,
            { transform: [{ translateY: target * size * SITS_LOW }] },
          ]}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    overflow: 'hidden',
  },
  lit: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
