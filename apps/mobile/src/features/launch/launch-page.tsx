import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';

export const LAUNCH_STEPS = 4;

/** The four small marks that say how far through first launch this is. */
export function StepDots({ step }: { readonly step: number }) {
  const { palette } = useScreenStyle();
  const t = useT();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('launch.step', { step, total: LAUNCH_STEPS })}
      style={styles.dots}
    >
      {Array.from({ length: LAUNCH_STEPS }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index + 1 === step
              ? [styles.dotCurrent, { backgroundColor: palette.ink }]
              : { backgroundColor: `${palette.ink}33` },
          ]}
        />
      ))}
    </View>
  );
}

export interface LaunchPageProps {
  readonly step: number;
  readonly testID: string;
  /** Scrolls when the text is large, so nothing is ever cut off. */
  readonly children: ReactNode;
  /** The action, kept at the bottom of the screen. */
  readonly footer: ReactNode;
}

/** The layout every first-launch step shares: its content, the step marks and the action. */
export function LaunchPage({ step, testID, children, footer }: LaunchPageProps) {
  const { palette } = useScreenStyle();
  return (
    <SafeFrame testID={testID} style={[styles.page, { backgroundColor: palette.page }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      <View style={styles.footer}>
        <StepDots step={step} />
        {footer}
      </View>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCurrent: {
    width: 20,
  },
});
