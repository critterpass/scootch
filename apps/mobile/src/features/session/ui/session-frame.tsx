import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

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
  readonly align?: 'center' | 'start';
  readonly children: ReactNode;
}

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
  children,
}: SessionFrameProps) {
  return (
    <SafeFrame style={[styles.fill, { backgroundColor: inks.page }]}>
      <Animated.View
        testID={testID}
        entering={FadeIn.duration(240).reduceMotion(ReduceMotion.Never)}
        style={styles.fill}
      >
        <View style={styles.top}>{top}</View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.middle, align === 'center' ? styles.centred : null]}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
