import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@scootch/tokens';

import { CloseButton, CORNER, type CloseButtonProps } from './corner-bar';
import { useRouteSheet } from './native-bar';
import { SHEET_TOP } from './sheet-frame';
import { useScreenStyle } from './use-screen-style';

/** The room under a sheet's dock where the phone has no home bar. */
const FOOT = 16;
const DOCK_GUTTER = 14;
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
        { backgroundColor: palette.page, paddingBottom: Math.max(insets.bottom, FOOT) },
        inSheet ? null : styles.drawn,
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

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'flex-end' },
  // No height and nothing that grows: the sheet is the sum of what is on it.
  sheet: { paddingTop: SHEET_TOP + spacing.sm },
  drawn: { borderTopLeftRadius: DRAWN_RADIUS, borderTopRightRadius: DRAWN_RADIUS },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: DOCK_GUTTER, paddingTop: spacing.lg },
  // Drawn last, so nothing on the sheet can lie over it and take its touch.
  close: { position: 'absolute', top: SHEET_TOP, right: CORNER.side },
});
