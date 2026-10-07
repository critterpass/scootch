import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GlassSurface } from '../../../ui/glass-surface';
import { PressSpring } from '../../../ui/motion/press-spring';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

/** Every pill and corner control of the session is this tall, as the board draws them. */
export const PILL_HEIGHT = 44;

export interface GlassPillProps {
  readonly label: string;
  /** What happens, for VoiceOver. A pill that does nothing has none. */
  readonly hint?: string;
  readonly testID: string;
  readonly inks: SessionInks;
  readonly onPress?: () => void;
  /** What leads the label: the monster's dot, the plus of "Park a thought". */
  readonly lead?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * The session's glass pill: 44 points tall, fully round, one line of 15-point semibold. It
 * answers a press with the spring whether or not the press does anything, as the board's does.
 */
export function GlassPill({ label, hint, testID, inks, onPress, lead, style }: GlassPillProps) {
  return (
    <PressSpring
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      {...(hint ? { accessibilityHint: hint } : {})}
      testID={testID}
      onPress={onPress}
      {...(onPress ? { feedback: 'choice' as const } : {})}
      style={[styles.press, style]}
    >
      <GlassSurface style={[styles.pill, lead ? styles.led : null]}>
        {lead}
        <SessionText face="pill" color={inks.ink} numberOfLines={1} style={styles.label}>
          {label}
        </SessionText>
      </GlassSurface>
    </PressSpring>
  );
}

/** The tomato dot that leads the monster's pill. */
export function PillDot({ inks }: { readonly inks: SessionInks }) {
  return <View style={[styles.dot, { backgroundColor: inks.tomato }]} />;
}

/** The plus of "Park a thought": two 2.2-point strokes, 12 points across. */
export function PillPlus({ inks }: { readonly inks: SessionInks }) {
  return (
    <View style={styles.plus}>
      <View style={[styles.plusUp, { backgroundColor: inks.ink }]} />
      <View style={[styles.plusAcross, { backgroundColor: inks.ink }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  press: {
    flexShrink: 1,
  },
  pill: {
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  // A pill led by a glyph sits a little closer to its leading edge.
  led: {
    paddingLeft: 14,
    paddingRight: 18,
  },
  label: {
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  plus: {
    width: 12,
    height: 12,
  },
  plusUp: {
    position: 'absolute',
    left: 4.9,
    top: 0,
    width: 2.2,
    height: 12,
    borderRadius: 1,
  },
  plusAcross: {
    position: 'absolute',
    top: 4.9,
    left: 0,
    height: 2.2,
    width: 12,
    borderRadius: 1,
  },
});
