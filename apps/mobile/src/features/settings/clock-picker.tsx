import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { clockText } from '../notes/notes-settings';

/** Where the system has no time picker to lend, the time moves in half hours. */
const STEP = 30;
const DAY = 24 * 60;

export interface ClockPickerProps {
  /** What the time is for ("From", "To"): its accessible name. */
  readonly label: string;
  /** Minutes after midnight on the wall clock. */
  readonly minute: number;
  readonly onChange: (minute: number) => void;
  readonly testID: string;
}

const moved = (minute: number, by: number) => (minute + by + DAY) % DAY;

/**
 * A time, set a half hour at a time: the time between an earlier and a later button. iOS uses the
 * system's own picker instead (`clock-picker.ios.tsx`).
 */
export function ClockPicker({ label, minute, onChange, testID }: ClockPickerProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const step = (text: string, by: number, id: string) => (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      onPress={() => onChange(moved(minute, by))}
      feedback="choice"
      testID={`${testID}-${id}`}
      style={[styles.step, { backgroundColor: `${palette.ink}0F` }]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.stepText, { color: palette.ink, fontSize: size(15) }]}
      >
        {text}
      </Text>
    </PressSpring>
  );
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: clockText(minute) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        onChange(moved(minute, event.nativeEvent.actionName === 'increment' ? STEP : -STEP))
      }
      style={styles.picker}
    >
      {step(t('settings.quiet.earlier'), -STEP, 'earlier')}
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.time, { color: palette.ink, fontSize: size(17) }]}
        testID={`${testID}-value`}
      >
        {clockText(minute)}
      </Text>
      {step(t('settings.quiet.later'), STEP, 'later')}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 52, textAlign: 'center' },
  step: {
    minHeight: 36,
    minWidth: 44,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontWeight: '600' },
});
