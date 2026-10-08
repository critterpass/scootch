import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** The dark stage is dark in both appearances, so what is on it is drawn in its own inks. */
export const NIGHT_INK = '#FFFFFF';
const GLASS = 'rgba(255,255,255,0.1)';
const EDGE = 'rgba(255,255,255,0.18)';
const PAPER = '#FBF8F3';
const ON_PAPER = '#1C1A17';

export interface NightRoundProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress: () => void;
  readonly testID: string;
  /** 44 in a corner of the screen, 52 beside the card's actions. */
  readonly size?: 44 | 52;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

/** A round control on the dark stage: faint glass with a hairline, and a white glyph on it. */
export function NightRound(props: NightRoundProps) {
  const { size = 44, disabled = false } = props;
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={props.onPress}
      hitSlop={size === 44 ? spacing.sm : 0}
      restOpacity={disabled ? 0.35 : 1}
      testID={props.testID}
      style={[styles.round, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {props.children}
    </PressSpring>
  );
}

/** The cross of a close control, in white. */
export function NightCross() {
  return (
    <View style={styles.cross}>
      <View style={[styles.stroke, styles.down]} />
      <View style={[styles.stroke, styles.up]} />
    </View>
  );
}

/** An arrow pointing to one side, in white, as the board draws it from two strokes of a square. */
export function NightArrow({ to }: { readonly to: 'left' | 'right' }) {
  return <View style={[styles.arrow, to === 'left' ? styles.left : styles.right]} />;
}

export interface NightCapsuleProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress: () => void;
  readonly testID: string;
  /** `paper` is the one action; `glass` sits beside it. */
  readonly tone: 'glass' | 'paper';
}

/** A capsule on the dark stage, 52 points tall. It grows instead of cutting its label short. */
export function NightCapsule({ label, hint, onPress, testID, tone }: NightCapsuleProps) {
  const { allowFontScaling, size } = useScreenStyle();
  const paper = tone === 'paper';
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      feedback={paper ? 'primary' : 'choice'}
      testID={testID}
      style={[styles.capsule, paper ? styles.paper : styles.glass]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.label, { fontSize: size(16), color: paper ? ON_PAPER : NIGHT_INK }]}
      >
        {label}
      </Text>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EDGE,
  },
  cross: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  stroke: {
    position: 'absolute',
    width: 2.2,
    height: 16,
    borderRadius: 1,
    backgroundColor: NIGHT_INK,
  },
  down: { transform: [{ rotate: '45deg' }] },
  up: { transform: [{ rotate: '-45deg' }] },
  arrow: { width: 10, height: 10, borderColor: NIGHT_INK },
  left: {
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    transform: [{ translateX: 2 }, { rotate: '45deg' }],
  },
  right: {
    borderRightWidth: 2.4,
    borderTopWidth: 2.4,
    transform: [{ translateX: -2 }, { rotate: '45deg' }],
  },
  capsule: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  glass: { backgroundColor: GLASS, borderWidth: StyleSheet.hairlineWidth, borderColor: EDGE },
  paper: { backgroundColor: PAPER },
  label: { fontFamily: fonts.body, fontWeight: '600', textAlign: 'center' },
});
