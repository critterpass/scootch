import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

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

/**
 * A quiet control: a small capsule in a faint fill, as wide as its words and in the middle of
 * its row. It is never bare words: everything that can be pressed looks as if it can.
 */
export function TextButton({ label, hint, testID, inks, onPress, style }: ControlProps) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      onPress={onPress}
      feedback="choice"
      hitSlop={6}
      style={[styles.quiet, { backgroundColor: `${inks.ink}0F` }, style]}
    >
      <SessionText face="chip" color={inks.ink} style={styles.centred}>
        {label}
      </SessionText>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  filled: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quiet: {
    alignSelf: 'center',
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centred: {
    textAlign: 'center',
  },
});
