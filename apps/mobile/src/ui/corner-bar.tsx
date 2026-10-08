import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { RoundButton } from './buttons';
import { Chevron, MoreIcon } from './icons';
import { GlassGroup } from './glass-surface';
import { useScreenStyle } from './use-screen-style';

/**
 * Where every screen's corner control sits: the place the system's navigation bar gives its own
 * items. The bar starts at the safe area's top and is 44 points tall, its items are 44 points
 * across and sit on the bar's 16-point margin. A screen with no bar (the one screen, the session,
 * the reveal, care) puts its corner controls here, so they are where a screen with the system's bar
 * has them and nothing shifts as screens move into each other.
 */
export const CORNER = { top: 0, side: spacing.md, size: 44 } as const;

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
    <GlassGroup style={styles.bar}>
      {leading ?? <View style={styles.empty} />}
      {children}
      {trailing ?? <View style={styles.empty} />}
    </GlassGroup>
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

/** The way back, in the leading corner: the round glass button with one arrow. */
export function BackButton({ label, hint, onPress, testID }: CloseButtonProps) {
  const { palette } = useScreenStyle();
  return (
    <RoundButton label={label} hint={hint} onPress={onPress} testID={testID}>
      <Chevron color={palette.ink} direction="left" />
    </RoundButton>
  );
}

/**
 * The way on to the page at the trailing side, in the trailing corner: the round glass button
 * with one arrow pointing there. The page beside home that lies to its leading side closes with
 * this, since home is that way.
 */
export function ForwardButton({ label, hint, onPress, testID }: CloseButtonProps) {
  const { palette } = useScreenStyle();
  return (
    <RoundButton label={label} hint={hint} onPress={onPress} testID={testID}>
      <Chevron color={palette.ink} direction="right" />
    </RoundButton>
  );
}

/** A screen's own menu, in the trailing corner: the round glass button with three dots. */
export function MenuButton({ label, hint, onPress, testID }: CloseButtonProps) {
  const { palette } = useScreenStyle();
  return (
    <RoundButton label={label} hint={hint} onPress={onPress} testID={testID}>
      <MoreIcon color={palette.ink} />
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
