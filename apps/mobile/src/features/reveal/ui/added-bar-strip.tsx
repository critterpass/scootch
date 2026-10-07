import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BOUNCE_CURVE } from '../../../ui/motion/motion-tokens';
import { useMayMove } from '../../../ui/motion/use-feel';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** The board's bar is sixteen steps of 0.11 seconds. */
const BAR_MS = 1760;
/** The new bar waits for the step to rise in, then drops into its outline. */
const ADDED_AFTER_MS = 520;
const ADDED_MS = 420;
const ALWAYS = ReduceMotion.Never;

export interface AddedBarStripProps {
  /** How many bars the week has now, today's included. */
  readonly barCount: number;
  /** Whether today's bar is sounding. */
  readonly playing: boolean;
}

/**
 * The strip under the record on the day a bar is earned: the bars the week already had, and
 * today's being added. It arrives as an empty outline, the bar drops into it, and while the bar
 * sounds it fills in tomato from its leading edge, as the board's strip does under a playing record.
 */
export function AddedBarStrip({ barCount, playing }: AddedBarStripProps) {
  const { palette } = useScreenStyle();
  const mayMove = useMayMove();
  const added = useSharedValue(mayMove ? 0 : 1);
  const played = useSharedValue(0);

  useEffect(() => {
    if (!mayMove) return undefined;
    added.value = withDelay(
      ADDED_AFTER_MS,
      withTiming(1, { duration: ADDED_MS, easing: BOUNCE_CURVE, reduceMotion: ALWAYS }),
    );
    return () => cancelAnimation(added);
    // Played once, when the step opens.
  }, [added]);
  useEffect(() => {
    cancelAnimation(played);
    played.value = playing
      ? withSequence(
          withTiming(0, { duration: 0, reduceMotion: ALWAYS }),
          withTiming(1, { duration: BAR_MS, easing: Easing.linear, reduceMotion: ALWAYS }),
        )
      : withTiming(0, { duration: 240, reduceMotion: ALWAYS });
    return () => cancelAnimation(played);
  }, [playing, played]);

  const dropping = useAnimatedStyle(() => ({
    opacity: Math.min(1, added.value * 2),
    transform: [{ scaleX: Math.max(0.001, added.value) }],
  }));
  const filling = useAnimatedStyle(() => ({ width: `${played.value * 100}%` }));
  const track = `${palette.ink}1F`;
  return (
    <View style={styles.strip} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 7 }, (_, index) => {
        const today = index === barCount - 1;
        const earned = index < barCount - 1;
        return (
          <View
            key={index}
            style={[
              styles.segment,
              earned ? { backgroundColor: track } : { borderWidth: 1, borderColor: track },
            ]}
          >
            {today ? (
              <Animated.View style={[styles.bar, { backgroundColor: track }, dropping]}>
                <Animated.View style={[styles.bar, { backgroundColor: palette.tomato }, filling]} />
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4, alignSelf: 'stretch' },
  segment: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', justifyContent: 'center' },
  bar: { height: 5, borderRadius: 3, transformOrigin: 'left center' },
});
