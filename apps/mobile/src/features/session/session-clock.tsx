import { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { cappedSize, curves, ink, type } from '../desk/class-style';

import type { SessionClock } from './session-model';

/** The board's `rollA`: a digit that changes drops into place from above, 300 ms. */
const roll = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -29 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: curves.ui },
}).duration(300);

/**
 * The time left in large rounded figures, each digit rolling in as it changes, "of 10 min" beside
 * it, and the period's progress as a bar beneath.
 */
export function SessionClockView({ clock }: { readonly clock: SessionClock }) {
  const t = useT();
  const sizing = useTextSizing();
  const mayMove = useMayMove();
  // The figures grow with the text size only so far: a clock split across lines cannot be read.
  const figure = cappedSize(sizing, 64, 1.4);
  return (
    <>
      <View style={styles.timerRow}>
        <View
          testID="session-left"
          accessible
          accessibilityLabel={t('session.left', { time: clock.left })}
          style={styles.digits}
        >
          {clock.left.split('').map((ch, i) => (
            <Animated.Text
              key={`${i}-${ch}`}
              {...(mayMove ? { entering: roll } : {})}
              allowFontScaling={sizing.allowFontScaling}
              maxFontSizeMultiplier={1.4}
              style={[type.rounded, styles.timer, { fontSize: figure, lineHeight: figure }]}
            >
              {ch}
            </Animated.Text>
          ))}
        </View>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.muted, { fontSize: sizing.size(15) }]}
        >
          {t('session.of', { minutes: clock.minutes })}
        </Text>
      </View>
      <GlidingBar gone={clock.gone} color={ink.text} track="rgba(28,26,24,0.08)" />
    </>
  );
}

/**
 * A period's progress: the fill glides to each new reading, 220 ms linear, as the board's width
 * transition does; where nothing may move it is set. The fill has no children, so its width moves
 * nothing else and its round end stays round.
 */
export function GlidingBar({
  gone,
  color,
  track,
  style,
}: {
  /** 0 to 1 of the time gone. */
  readonly gone: number;
  readonly color: string;
  readonly track: string;
  readonly style?: ViewProps['style'];
}) {
  const mayMove = useMayMove();
  const shown = useSharedValue(gone);
  useEffect(() => {
    shown.set(mayMove ? withTiming(gone, { duration: 220, easing: Easing.linear }) : gone);
  }, [gone, mayMove, shown]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, shown.get()) * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: track }, style]}>
      <Animated.View style={[styles.trackFill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  timerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 10,
    marginTop: 4,
  },
  digits: { flexDirection: 'row', overflow: 'hidden' },
  timer: { color: ink.text, letterSpacing: -1.28, fontVariant: ['tabular-nums'] },
  muted: { color: ink.muted },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  trackFill: { height: '100%', borderRadius: 3 },
});
