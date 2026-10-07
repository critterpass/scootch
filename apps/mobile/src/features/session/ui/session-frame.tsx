import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@scootch/tokens';

import type { SessionInks } from './session-inks';
import { CORNER } from '../../../ui/corner-bar';
import { SafeFrame } from '../../../ui/safe-frame';

export interface SessionFrameProps {
  readonly inks: SessionInks;
  readonly testID: string;
  /** The corners: a tag or a close button. */
  readonly top?: ReactNode;
  /** What stays at the bottom, above the keyboard and outside the scrolling middle. */
  readonly footer?: ReactNode;
  /** Drawn over everything, untouchable: the burst. */
  readonly over?: ReactNode;
  /**
   * `drawn` is a screen laid out to its board frame: the middle starts under the corners with no
   * padding of its own, and the footer sits where the board puts it.
   */
  readonly align?: 'center' | 'start' | 'drawn';
  /** How far in from the sides the footer sits on a drawn screen. */
  readonly footerInset?: number;
  /** The page behind the screen, when it is not the usual one. */
  readonly page?: string;
  readonly children: ReactNode;
}

/** The board's footers end 34 points above the screen's edge, which is the home bar's own room. */
const DRAWN_FOOT = 34;
/** On a phone with no home bar the footer still keeps clear of the edge. */
const LEAST_FOOT = 12;

/**
 * One session screen: corners, a middle that scrolls when the text is large, and a footer. Each
 * screen fades in over the last, which is also all that moves with Reduce Motion on.
 */
export function SessionFrame({
  inks,
  testID,
  top,
  footer,
  over,
  align = 'center',
  footerInset = 0,
  page,
  children,
}: SessionFrameProps) {
  const insets = useSafeAreaInsets();
  const drawn = align === 'drawn';
  const foot = Math.max(LEAST_FOOT, DRAWN_FOOT - insets.bottom);
  return (
    <SafeFrame style={[styles.fill, { backgroundColor: page ?? inks.page }]}>
      <Animated.View
        testID={testID}
        entering={FadeIn.duration(240).reduceMotion(ReduceMotion.Never)}
        style={styles.fill}
      >
        <View style={styles.top}>{top}</View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            drawn ? styles.drawn : [styles.middle, align === 'center' ? styles.centred : null]
          }
        >
          {children}
        </ScrollView>
        {footer ? (
          <View
            style={
              drawn
                ? { paddingHorizontal: footerInset, paddingBottom: foot, paddingTop: spacing.sm }
                : styles.footer
            }
          >
            {footer}
          </View>
        ) : null}
      </Animated.View>
      {over}
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  top: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    // The same corner as every other screen, so the close control never shifts in a transition.
    paddingHorizontal: CORNER.side,
    paddingTop: CORNER.top,
  },
  middle: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawn: {
    flexGrow: 1,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
