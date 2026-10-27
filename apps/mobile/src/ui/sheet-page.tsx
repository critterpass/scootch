import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenTop } from './sheet-frame';

/** The row of a sheet's corner controls, over the top of the page. */
export const SHEET_BAR = 56;
/** The room under the last thing on the page, above the home bar. */
const FOOT = 24;

export interface SheetPageProps {
  readonly testID: string;
  /** The page's own colour, behind the page and behind the bar. */
  readonly background: string;
  /** What sits in the bar: the close or back control at the leading side, and anything across. */
  readonly bar: ReactNode;
  readonly contentStyle?: ScrollViewProps['contentContainerStyle'];
  readonly showsVerticalScrollIndicator?: boolean;
  readonly children: ReactNode;
}

/**
 * A whole page opened as a sheet. Its scroll view is the first thing on it, so the system's sheet
 * follows it: pulled down from the top of what it shows, the sheet closes, as any system sheet
 * does. The bar with the corner controls lies over the page's top, right under the grabber, and
 * what scrolls up goes under it. Scrolling puts the keyboard away, and so does a tap beside a field.
 *
 * Drawn on a page instead (a capture, a link opened cold), the bar starts under the status bar.
 */
export function SheetPage({
  testID,
  background,
  bar,
  contentStyle,
  showsVerticalScrollIndicator = true,
  children,
}: SheetPageProps) {
  const top = useScreenTop();
  const insets = useSafeAreaInsets();
  // No view around the two: the system's sheet sizes the scroll view only when it is the screen's
  // own first child, and with a view around it the scroll view was moved off the page.
  return (
    <>
      <ScrollView
        style={[styles.page, { backgroundColor: background }]}
        contentContainerStyle={[
          contentStyle,
          { paddingTop: top + SHEET_BAR, paddingBottom: insets.bottom + FOOT },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        testID={testID}
      >
        {children}
      </ScrollView>
      {/* Drawn after the page, so it lies over what scrolls under it and keeps its touch. */}
      <View
        style={[
          styles.bar,
          { backgroundColor: background, paddingTop: top, minHeight: top + SHEET_BAR },
        ]}
      >
        {bar}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
