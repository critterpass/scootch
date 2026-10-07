import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { SafeFrame } from '../../ui/safe-frame';
import { CloseButton, CornerBar } from '../../ui/corner-bar';
import { NativeBar, useRouteBar } from '../../ui/native-bar';
import { useScreenStyle } from '../../ui/use-screen-style';

const TITLE_SIZE = 34;
/** From the bottom of the screen up to a dock, and the dock's gutter, as the boards draw them. */
const DOCK_BOTTOM = 30;
const DOCK_GUTTER = 14;
const BAR_TITLE_SIZE = 17;

export interface PageProps {
  /** The large title of a page under Settings. Left out, the small centred one is shown. */
  readonly title?: string;
  readonly barTitle?: string;
  readonly onClose: () => void;
  readonly testID: string;
  /** The page's actions, in a dock that stays at the bottom while the page scrolls above it. */
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

/** A plain page of rows: a close button, a title, and a list that scrolls at any text size. */
export function Page({ title, barTitle, onClose, testID, footer, children }: PageProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const insets = useSafeAreaInsets();
  // The board's 30 points under a dock, never less than the home bar's own clear space. `kept` is
  // the part of that space the frame around the page already keeps clear.
  const dockOver = (kept: number) =>
    footer === undefined ? null : (
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, DOCK_BOTTOM) - kept }]}>
        {footer}
      </View>
    );
  const close = {
    label: t('settings.close'),
    hint: t('settings.close.hint'),
    onPress: onClose,
    testID: `${testID}-close`,
  };
  // Under the system's bar the title and the close control are the bar's, and the list runs
  // beneath it: the system keeps it clear of the bar and of the home indicator.
  if (useRouteBar() === 'page') {
    return (
      <View style={[styles.page, { backgroundColor: palette.page }]} testID={testID}>
        <NativeBar title={title ?? barTitle ?? ''} close={close} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          testID={`${testID}-list`}
        >
          {children}
        </ScrollView>
        {dockOver(0)}
      </View>
    );
  }
  return (
    <SafeFrame style={[styles.page, { backgroundColor: palette.page }]} testID={testID}>
      <CornerBar trailing={<CloseButton {...close} />}>
        {barTitle === undefined ? null : (
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            style={[styles.barTitle, { color: palette.ink, fontSize: size(BAR_TITLE_SIZE) }]}
          >
            {barTitle}
          </Text>
        )}
      </CornerBar>
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
      {dockOver(insets.bottom)}
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    // The close control is in the trailing corner: the title is centred on the screen beside it.
    marginLeft: 44,
    alignSelf: 'center',
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  footer: { paddingHorizontal: DOCK_GUTTER, paddingTop: spacing.sm },
  title: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.6 },
});
