import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PressSpring } from '../../ui/motion/press-spring';

const TITLE_SIZE = 34;
const BAR_TITLE_SIZE = 17;

export interface PageProps {
  /** The large title of a page under Settings. Left out, the small centred one is shown. */
  readonly title?: string;
  readonly barTitle?: string;
  readonly onClose: () => void;
  readonly testID: string;
  readonly children: ReactNode;
}

/** A plain page of rows: a close button, a title, and a list that scrolls at any text size. */
export function Page({ title, barTitle, onClose, testID, children }: PageProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <SafeFrame style={[styles.page, { backgroundColor: palette.page }]} testID={testID}>
      <View style={styles.bar}>
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={t('settings.close')}
          accessibilityHint={t('settings.close.hint')}
          onPress={onClose}
          hitSlop={spacing.sm}
          testID={`${testID}-close`}
          style={[styles.close, { backgroundColor: palette.surface }]}
        >
          <View style={[styles.cross, { backgroundColor: palette.ink }]} />
          <View style={[styles.cross, styles.crossOver, { backgroundColor: palette.ink }]} />
        </PressSpring>
        {barTitle === undefined ? null : (
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            style={[styles.barTitle, { color: palette.ink, fontSize: size(BAR_TITLE_SIZE) }]}
          >
            {barTitle}
          </Text>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.content} testID={`${testID}-list`}>
        {title === undefined ? null : (
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            style={[styles.title, { color: palette.ink, fontSize: size(TITLE_SIZE) }]}
          >
            {title}
          </Text>
        )}
        {children}
      </ScrollView>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  crossOver: { transform: [{ rotate: '-45deg' }] },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 44,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.6 },
});
