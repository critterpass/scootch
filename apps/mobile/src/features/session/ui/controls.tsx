import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { GlassPill, GlassTag } from '../../../ui/buttons';
import { CloseButton } from '../../../ui/corner-bar';

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

/** The glass capsule that floats over the session: "Park a thought". */
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
    <GlassPill label={label} hint={hint} testID={testID} onPress={onPress} style={style}>
      {lead}
      <SessionText face="action" color={inks.ink}>
        {label}
      </SessionText>
    </GlassPill>
  );
}

/** A glass label that is not a control: the monster's name and the session's length. */
export function Tag({ label, inks }: { readonly label: string; readonly inks: SessionInks }) {
  return (
    <GlassTag style={styles.tag}>
      <View style={[styles.dot, { backgroundColor: inks.tomato }]} />
      <SessionText face="caption" color={inks.ink} numberOfLines={1} style={styles.tagLabel}>
        {label}
      </SessionText>
    </GlassTag>
  );
}

/** The round close button in a corner: the same control, in the same place, as on every screen. */
export function RoundButton({ label, hint, testID, onPress }: ControlProps) {
  return <CloseButton label={label} hint={hint} testID={testID} onPress={onPress} />;
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
