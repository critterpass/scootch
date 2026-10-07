import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';
import { PressSpring } from '../../../ui/motion/press-spring';

export interface ControlProps {
  readonly label: string;
  /** What happens, for VoiceOver. */
  readonly hint: string;
  readonly testID: string;
  readonly inks: SessionInks;
  readonly onPress: () => void;
  readonly style?: StyleProp<ViewStyle>;
}

const lift = (inks: SessionInks) =>
  ({
    backgroundColor: inks.surface,
    shadowColor: '#1C1A17',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  }) as const;

/** The soft raised capsule: "Park a thought", the session's name. */
export function Capsule({
  label,
  hint,
  testID,
  inks,
  onPress,
  style,
  lead,
}: ControlProps & { readonly lead?: ReactNode }) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      onPress={onPress}
      style={[styles.capsule, lift(inks), style]}
    >
      {lead}
      <SessionText face="action" color={inks.ink}>
        {label}
      </SessionText>
    </PressSpring>
  );
}

/** A label that is not a control: the monster's name and the session's length. */
export function Tag({ label, inks }: { readonly label: string; readonly inks: SessionInks }) {
  return (
    <View style={[styles.capsule, styles.tag, lift(inks)]}>
      <View style={[styles.dot, { backgroundColor: inks.tomato }]} />
      <SessionText face="caption" color={inks.ink} numberOfLines={1} style={styles.tagLabel}>
        {label}
      </SessionText>
    </View>
  );
}

/** The round close button in a corner. */
export function RoundButton({ label, hint, testID, inks, onPress }: ControlProps) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      style={[styles.round, lift(inks)]}
    >
      <View style={[styles.cross, { backgroundColor: inks.ink }]} />
      <View style={[styles.cross, styles.crossOver, { backgroundColor: inks.ink }]} />
    </PressSpring>
  );
}

/** The one filled action of a screen. */
export function FilledButton({
  label,
  hint,
  testID,
  inks,
  onPress,
  style,
  tone = 'ink',
}: ControlProps & { readonly tone?: 'ink' | 'tomato' }) {
  const fill = tone === 'tomato' ? inks.tomato : inks.button;
  const ink = tone === 'tomato' ? inks.onTomato : inks.onButton;
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      onPress={onPress}
      feedback="primary"
      style={[styles.filled, { backgroundColor: fill }, style]}
    >
      <SessionText face="action" color={ink} style={styles.centred}>
        {label}
      </SessionText>
    </PressSpring>
  );
}

/** A quiet control: words only. */
export function TextButton({
  label,
  hint,
  testID,
  inks,
  onPress,
  style,
  strong = false,
}: ControlProps & { readonly strong?: boolean }) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      onPress={onPress}
      style={[styles.text, style]}
    >
      <SessionText face="body" color={strong ? inks.ink : inks.muted} style={styles.centred}>
        {label}
      </SessionText>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  capsule: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tag: {
    flexShrink: 1,
    paddingHorizontal: spacing.md,
  },
  tagLabel: {
    flexShrink: 1,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  crossOver: {
    transform: [{ rotate: '-45deg' }],
  },
  filled: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centred: {
    textAlign: 'center',
  },
});
