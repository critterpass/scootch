import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { fonts, shadows, spacing, tracking } from '@scootch/tokens';

import { GlassSurface, glassPressOwner } from './glass-surface';
import { useScreenStyle } from './use-screen-style';
import { PressSpring, type PressSpringProps } from './motion/press-spring';
import { ZoomLink } from './zoom-link';

/** The height of every capsule and round control in the dock, as the design draws them. */
export const CONTROL_HEIGHT = 54;
const ROUND_SIZE = 44;
const LABEL_SIZE = 17;
/** The light palette's ink, which the board's white label is written on. */
const INK = '#1C1A17';

export interface CapsuleButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress?: () => void;
  /** `ink` is the one action; `quiet` sits beside or under it. */
  readonly tone?: 'ink' | 'quiet';
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

/** A full capsule with one label. It grows taller instead of cutting its label short. */
export function CapsuleButton({
  label,
  hint,
  onPress,
  tone = 'ink',
  icon,
  disabled = false,
  testID,
  style,
}: CapsuleButtonProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const ink = tone === 'ink';
  // The board writes the filled action in white on ink; on the dark page the ink is light and the
  // label takes the page's colour.
  const onInk = palette.ink === INK ? '#FFFFFF' : palette.page;
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      feedback={ink ? 'primary' : 'choice'}
      restOpacity={disabled ? 0.45 : 1}
      style={[
        styles.capsule,
        { backgroundColor: ink ? palette.ink : `${palette.ink}0F` },
        ink && styles.lifted,
        style,
      ]}
    >
      {icon}
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.label,
          {
            color: ink ? onInk : palette.ink,
            fontSize: size(LABEL_SIZE),
            letterSpacing: size(LABEL_SIZE) * tracking.action,
          },
        ]}
      >
        {label}
      </Text>
    </PressSpring>
  );
}

export interface RoundButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress?: () => void;
  /** An inert button is drawn and read out, and says it does nothing yet. */
  readonly inert?: boolean;
  /**
   * The screen this button opens, when that screen should grow out of the button with the system's
   * zoom. The press then goes through the router's link to it; `onPress` opens it everywhere else.
   */
  readonly zoomTo?: Href;
  readonly testID?: string;
  readonly children: ReactNode;
}

/**
 * A round glass control for a corner of the screen. On the system's glass the surface itself
 * answers the finger; what is drawn on it takes no touch, so the touch reaches the glass.
 */
export function RoundButton({
  label,
  hint,
  onPress,
  inert = false,
  zoomTo,
  testID,
  children,
}: RoundButtonProps) {
  const button = (press: PressSpringProps['onPress']) => (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      onPress={press}
      testID={testID}
      hitSlop={spacing.sm}
      answeredBy={glassPressOwner(true)}
    >
      <GlassSurface interactive style={styles.round}>
        <View pointerEvents="none" style={styles.roundInner}>
          {children}
        </View>
      </GlassSurface>
    </PressSpring>
  );
  if (zoomTo === undefined || inert) return button(onPress);
  return (
    <ZoomLink to={zoomTo} onPress={onPress}>
      {button}
    </ZoomLink>
  );
}

/** The space between a dock's edge and the controls in it, as the design draws it. */
export const DOCK_PADDING = 7;

export interface GlassDockProps {
  readonly children: ReactNode;
  readonly style?: ViewProps['style'];
  readonly testID?: string;
}

/**
 * The bottom dock: one glass capsule that floats above the page and holds a screen's actions. The
 * buttons in it are tinted fills, never glass on glass, and its corners are concentric with theirs.
 */
export function GlassDock({ children, style, testID }: GlassDockProps) {
  return (
    <GlassSurface style={[styles.dock, style]} {...(testID ? { testID } : {})}>
      {children}
    </GlassSurface>
  );
}

export interface GlassTagProps {
  readonly children: ReactNode;
  readonly style?: ViewProps['style'];
  readonly testID?: string;
}

/** A glass pill that is only read: a name, a state. */
export function GlassTag({ children, style, testID }: GlassTagProps) {
  return (
    <GlassSurface style={[styles.pill, style]} {...(testID ? { testID } : {})}>
      {children}
    </GlassSurface>
  );
}

export interface GlassPillProps {
  readonly children: ReactNode;
  readonly onPress: () => void;
  readonly label: string;
  readonly hint: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * A glass pill that is pressed: a small control floating over the screen. On the system's glass
 * the pill answers the finger itself; what is written on it takes no touch.
 */
export function GlassPill({ children, onPress, label, hint, testID, style }: GlassPillProps) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      answeredBy={glassPressOwner(true)}
      {...(style === undefined ? {} : { style })}
    >
      <GlassSurface interactive style={styles.pill}>
        <View pointerEvents="none" style={styles.pillInner}>
          {children}
        </View>
      </GlassSurface>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderRadius: CONTROL_HEIGHT / 2 + DOCK_PADDING,
    padding: DOCK_PADDING,
    overflow: 'hidden',
  },
  pill: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  capsule: {
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  lifted: { boxShadow: shadows.inkButton },
  label: {
    fontFamily: fonts.body,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  round: {
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    borderRadius: ROUND_SIZE / 2,
    overflow: 'hidden',
  },
  roundInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
