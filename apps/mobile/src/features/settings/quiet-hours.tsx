import { StyleSheet, Text, View } from 'react-native';

import type { ClockTime } from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PressSpring } from '../../ui/motion/press-spring';

const STEP_MINUTES = 30;
const DAY_MINUTES = 24 * 60;

/** A clock time moved by half-hour steps, wrapping round midnight. */
export function stepClock(time: ClockTime, steps: number): ClockTime {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const moved = (hours * 60 + minutes + steps * STEP_MINUTES + DAY_MINUTES * 2) % DAY_MINUTES;
  const rounded = Math.round(moved / STEP_MINUTES) * STEP_MINUTES;
  const total = rounded % DAY_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export interface QuietHoursRowsProps {
  readonly start: ClockTime;
  readonly end: ClockTime;
  readonly onChange: (changes: { quietHoursStart?: ClockTime; quietHoursEnd?: ClockTime }) => void;
}

/** The two ends of the quiet hours, each moved earlier or later by half an hour. */
export function QuietHoursRows({ start, end, onChange }: QuietHoursRowsProps) {
  const t = useT();
  return (
    <>
      <Stepper
        id="start"
        label={t('settings.quietHours.from')}
        time={start}
        earlier={t('settings.quietHours.earlier')}
        later={t('settings.quietHours.later')}
        onStep={(steps) => onChange({ quietHoursStart: stepClock(start, steps) })}
      />
      <Stepper
        id="end"
        label={t('settings.quietHours.until')}
        time={end}
        earlier={t('settings.quietHours.earlier')}
        later={t('settings.quietHours.later')}
        onStep={(steps) => onChange({ quietHoursEnd: stepClock(end, steps) })}
      />
    </>
  );
}

interface StepperProps {
  readonly id: string;
  readonly label: string;
  readonly time: ClockTime;
  readonly earlier: string;
  readonly later: string;
  readonly onStep: (steps: number) => void;
}

function Stepper({ id, label, time, earlier, later, onStep }: StepperProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const button = (mark: string, hint: string, steps: number, name: string) => (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hint}`}
      accessibilityHint={hint}
      onPress={() => onStep(steps)}
      hitSlop={spacing.xs}
      testID={`settings-quiet-${id}-${name}`}
      style={[styles.step, { backgroundColor: `${palette.ink}0F` }]}
    >
      <Text allowFontScaling={false} style={[styles.mark, { color: palette.ink }]}>
        {mark}
      </Text>
    </PressSpring>
  );
  return (
    <View
      style={[styles.row, { borderTopColor: `${palette.ink}1F` }]}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: time }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        onStep(event.nativeEvent.actionName === 'increment' ? 1 : -1)
      }
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.label, { color: palette.muted, fontSize: size(15) }]}
      >
        {label}
      </Text>
      {button('−', earlier, -1, 'earlier')}
      <Text
        testID={`settings-quiet-${id}`}
        allowFontScaling={allowFontScaling}
        style={[styles.time, { color: palette.ink, fontSize: size(17) }]}
      >
        {time}
      </Text>
      {button('+', later, 1, 'later')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1, fontFamily: fonts.body },
  time: { fontFamily: fonts.body, minWidth: 56, textAlign: 'center' },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mark: { fontFamily: fonts.heading, fontSize: 22, fontWeight: '600' },
});
