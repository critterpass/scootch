import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { spacing } from '@scootch/tokens';

import { CORNER } from '../../ui/corner-bar';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { mix, presence, ramp, useKeepMotion } from './keep-motion';

export interface PaneHeadProps {
  /** Which tab this heads, as a place in `KEEP_TABS`. */
  readonly tab: number;
  readonly title: string;
  readonly subtitle?: string | undefined;
  /** Where a walk finds the line under the title. */
  readonly countTestID?: string;
}

/**
 * A tab's heading: its title and the line under it, in the one place and the one size on every
 * tab, beside the close control that stays put while the tabs change. As tabs trade places the
 * words of one settle out as the other's settle in.
 */
export function PaneHead({ tab, title, subtitle, countTestID }: PaneHeadProps) {
  const { palette } = useScreenStyle();
  const { from, to, progress, calm } = useKeepMotion();
  const settled = useAnimatedStyle(() => {
    const { v } = presence(from.value, to.value, progress.value, tab);
    if (calm) return { opacity: v };
    return {
      opacity: ramp(v, 0.5, 1),
      transform: [{ translateY: mix(10, 0, ramp(v, 0.3, 1)) }],
    };
  }, [tab, calm]);
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.titles, settled]}>
        <SessionText
          face="headline"
          color={palette.ink}
          accessibilityRole="header"
          numberOfLines={2}
        >
          {title}
        </SessionText>
        {subtitle ? (
          <SessionText face="caption" color={palette.muted} testID={countTestID}>
            {subtitle}
          </SessionText>
        ) : null}
      </Animated.View>
      {/* The close control floats here, drawn once by the frame over every tab. */}
      <View style={styles.corner} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: CORNER.size,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    // The title starts 24 points in, as it does under every corner bar.
    paddingLeft: CORNER.side + spacing.sm,
    paddingRight: CORNER.side,
  },
  titles: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  corner: { width: CORNER.size, height: CORNER.size },
});
