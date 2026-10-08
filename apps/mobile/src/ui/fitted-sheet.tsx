import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@scootch/tokens';

import { CloseButton, CORNER, type CloseButtonProps } from './corner-bar';
import { useRouteSheet } from './use-route-sheet';
import { SHEET_TOP } from './sheet-frame';
import { useScreenStyle } from './use-screen-style';

/** The room under what is on a sheet drawn on a page, where the phone has no home bar. */
const FOOT = 16;
/** One gutter for everything on a sheet: its cards and its dock share their edges. */
const GUTTER = 16;
/** How far words stand in from a card's edge, so they start where a card's own words do. */
const WORDS_IN = 8;
/** The sheet's own corner, where it is drawn on a page instead of by the system. */
const DRAWN_RADIUS = 34;

export interface FittedSheetProps {
  readonly testID: string;
  readonly close: CloseButtonProps;
  /** The sheet's choices, in a dock at its foot. */
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A sheet that is as tall as what is on it. Its content is laid out top to bottom at its own
 * height, with no list and nothing that stretches: the system reads that height and makes the
 * sheet exactly so tall. The close control floats in the trailing corner, where every screen has
 * one, and the choices sit in a dock at the foot, clear of the home bar.
 *
 * Drawn outside a sheet (a capture, a link opened cold) it is the same sheet resting at the foot
 * of a page.
 */
export function FittedSheet({ testID, close, footer, children }: FittedSheetProps) {
  const { palette } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const inSheet = useRouteSheet();
  const sheet = (
    <View
      testID={testID}
      style={[
        styles.sheet,
        { backgroundColor: palette.page },
        // The system keeps a sheet's own foot clear of the home bar: only a sheet drawn on a page
        // keeps that room itself. Adding it twice left a wide empty band under the dock.
        inSheet
          ? { paddingBottom: footer === undefined ? GUTTER : spacing.xs }
          : [styles.drawn, { paddingBottom: Math.max(insets.bottom, FOOT) }],
      ]}
    >
      <View style={styles.content}>{children}</View>
      {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
      <View style={styles.close}>
        <CloseButton {...close} />
      </View>
    </View>
  );
  if (inSheet) return sheet;
  return <View style={[styles.page, { backgroundColor: `${palette.ink}33` }]}>{sheet}</View>;
}

/**
 * A sheet's own words: its heading and the line under it. They stand a little in from the cards'
 * edge, keep clear of the close control, and at the top of a sheet sit level with it.
 */
export function SheetHeading({ children }: { readonly children: ReactNode }) {
  return <View style={styles.heading}>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'flex-end' },
  // No height and nothing that grows: the sheet is the sum of what is on it.
  sheet: { paddingTop: SHEET_TOP + spacing.sm },
  drawn: { borderTopLeftRadius: DRAWN_RADIUS, borderTopRightRadius: DRAWN_RADIUS },
  content: { paddingHorizontal: GUTTER, gap: spacing.md },
  footer: { paddingHorizontal: GUTTER, paddingTop: spacing.lg },
  heading: {
    minHeight: CORNER.size,
    justifyContent: 'center',
    gap: 10,
    paddingLeft: WORDS_IN,
    // The close control floats in the trailing corner: the words keep clear of it.
    paddingRight: CORNER.size + WORDS_IN,
  },
  // Drawn last, so nothing on the sheet can lie over it and take its touch.
  close: { position: 'absolute', top: SHEET_TOP, right: CORNER.side },
});
