import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { RoundButton } from './buttons';
import { useScreenStyle } from './use-screen-style';

/**
 * Where every screen's corner control sits: 4 points under the safe area's top, 16 points in from
 * the side, 44 points across. One place, so nothing shifts as screens move into each other.
 */
export const CORNER = { top: spacing.xs, side: spacing.md, size: 44 } as const;

export interface CornerBarProps {
  /** The control in the leading corner, or nothing. */
  readonly leading?: ReactNode;
  /** What sits between the corners: a title, a pill. */
  readonly children?: ReactNode;
  /** The control in the trailing corner: the close button, or the one screen's more button. */
  readonly trailing?: ReactNode;
}

/** The top row of a screen, with its corner controls in the one place they always are. */
export function CornerBar({ leading, children, trailing }: CornerBarProps) {
  return (
    <View style={styles.bar}>
      {leading ?? <View style={styles.empty} />}
      {children}
      {trailing ?? <View style={styles.empty} />}
    </View>
  );
}

export interface CloseButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress: () => void;
  readonly testID: string;
}

/** The close control of every screen: the round glass button with one cross. */
export function CloseButton({ label, hint, onPress, testID }: CloseButtonProps) {
  const { palette } = useScreenStyle();
  return (
    <RoundButton label={label} hint={hint} onPress={onPress} testID={testID}>
      <View style={styles.cross}>
        <View style={[styles.stroke, styles.down, { backgroundColor: palette.ink }]} />
        <View style={[styles.stroke, styles.up, { backgroundColor: palette.ink }]} />
      </View>
    </RoundButton>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: CORNER.size,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: CORNER.side,
    paddingTop: CORNER.top,
  },
  empty: { width: 0, height: CORNER.size },
  cross: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  stroke: { position: 'absolute', width: 16, height: 2, borderRadius: 1 },
  down: { transform: [{ rotate: '45deg' }] },
  up: { transform: [{ rotate: '-45deg' }] },
});
