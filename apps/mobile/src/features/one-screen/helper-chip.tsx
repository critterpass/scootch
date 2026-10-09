import { StyleSheet, Text } from 'react-native';

import { fonts } from '@scootch/tokens';

import { onInkOf } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The height of a helper chip, as the board draws the row of them. */
export const CHIP_HEIGHT = 40;
const CHIP_SIZE = 15;

export interface HelperChipProps {
  readonly label: string;
  readonly spokenLabel?: string;
  readonly hint: string;
  /** Picked or read back: the label is in ink. Otherwise it is the quiet grey of an offer. */
  readonly set: boolean;
  /** Drawn filled, as a chip chosen among others is. */
  readonly chosen?: boolean;
  readonly onPress: () => void;
  readonly testID: string;
  readonly role?: 'button' | 'radio';
}

/** One small outlined chip: a helper of the set task, or one answer among a row of them. */
export function HelperChip({
  label,
  spokenLabel,
  hint,
  set,
  chosen = false,
  onPress,
  testID,
  role = 'button',
}: HelperChipProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <PressSpring
      accessibilityRole={role}
      accessibilityLabel={spokenLabel ?? label}
      accessibilityHint={hint}
      {...(role === 'radio' ? { accessibilityState: { selected: chosen, checked: chosen } } : {})}
      onPress={onPress}
      feedback="choice"
      testID={testID}
      style={[
        styles.chip,
        chosen
          ? { backgroundColor: palette.ink, borderColor: palette.ink }
          : { borderColor: `${palette.ink}26` },
      ]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.label,
          {
            color: chosen ? onInkOf(palette) : set ? palette.ink : palette.muted,
            fontSize: size(CHIP_SIZE),
            lineHeight: size(CHIP_SIZE) * 1.3,
          },
        ]}
      >
        {label}
      </Text>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: CHIP_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.body, fontWeight: '500' },
});
