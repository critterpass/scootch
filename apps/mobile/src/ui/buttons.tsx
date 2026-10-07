import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { GlassSurface } from './glass-surface';
import { useScreenStyle } from './use-screen-style';

/** The height of every capsule and round control in the dock, as the design draws them. */
export const CONTROL_HEIGHT = 54;
const ROUND_SIZE = 44;
const LABEL_SIZE = 17;

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.capsule,
        {
          backgroundColor: ink ? palette.ink : `${palette.ink}0F`,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.label,
          { color: ink ? palette.page : palette.ink, fontSize: size(LABEL_SIZE) },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export interface RoundButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onPress?: () => void;
  /** An inert button is drawn and read out, and says it does nothing yet. */
  readonly inert?: boolean;
  readonly testID?: string;
  readonly children: ReactNode;
}

/** A round glass control for a corner of the screen. */
export function RoundButton({
  label,
  hint,
  onPress,
  inert = false,
  testID,
  children,
}: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      onPress={onPress}
      testID={testID}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <GlassSurface style={styles.round}>
        <View style={styles.roundInner}>{children}</View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: fonts.heading,
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
