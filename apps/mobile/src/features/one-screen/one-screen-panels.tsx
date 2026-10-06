import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { Chevron } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The session lengths on offer, in minutes. */
export const SESSION_MINUTES = [10, 25, 50] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

const ROW_SIZE = 17;
const SMALL_SIZE = 15;

export interface TaskSetChoicesProps {
  readonly treat: string;
  readonly minutes: SessionMinutes;
  readonly onTreat: (treat: string) => void;
  readonly onMinutes: (minutes: SessionMinutes) => void;
}

/** The two choices before a start: the treat for afterwards, and how long to go for. */
export function TaskSetChoices({ treat, minutes, onTreat, onMinutes }: TaskSetChoicesProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <View style={styles.choices}>
      <View
        style={[styles.treat, largeText && styles.stacked, { backgroundColor: palette.surface }]}
      >
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.rowLabel, { color: palette.ink, fontSize: size(ROW_SIZE) }]}
        >
          {t('taskSet.treat')}
        </Text>
        <TextInput
          value={treat}
          onChangeText={onTreat}
          placeholder={t('taskSet.treat.placeholder')}
          placeholderTextColor={palette.muted}
          accessibilityLabel={t('taskSet.treat')}
          accessibilityHint={t('taskSet.treat.hint')}
          allowFontScaling={allowFontScaling}
          maxLength={80}
          returnKeyType="done"
          testID="task-set-treat"
          style={[
            styles.treatInput,
            largeText && styles.treatInputStacked,
            { color: palette.ink, fontSize: size(ROW_SIZE) },
          ]}
        />
      </View>
      <View
        accessibilityRole="radiogroup"
        style={[
          styles.minutes,
          largeText && styles.stacked,
          { backgroundColor: `${palette.ink}0F` },
        ]}
      >
        {SESSION_MINUTES.map((option) => {
          const chosen = option === minutes;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t('taskSet.minutes', { minutes: option })}
              accessibilityHint={t('taskSet.minutes.hint')}
              onPress={() => onMinutes(option)}
              testID={`task-set-minutes-${option}`}
              style={[styles.minute, chosen && { backgroundColor: palette.surface }]}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.minuteLabel,
                  { color: palette.ink, fontSize: size(SMALL_SIZE) },
                  chosen && styles.minuteChosen,
                ]}
              >
                {t('taskSet.minutes', { minutes: option })}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The way into the world, on the quiet screen. The world is not built yet, so the row is drawn
 * faded, says so, and does nothing.
 */
export function WorldRow() {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={t('oneScreen.world')}
      accessibilityHint={t('oneScreen.notOpenYet')}
      accessibilityState={{ disabled: true }}
      testID="world-row"
      style={[styles.world, { backgroundColor: palette.surface }]}
    >
      <View style={styles.worldWords}>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.worldTitle, { color: palette.ink, fontSize: size(ROW_SIZE) }]}
        >
          {t('oneScreen.world')}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.rowLabel, { color: palette.muted, fontSize: size(SMALL_SIZE) }]}
        >
          {t('oneScreen.notOpenYet')}
        </Text>
      </View>
      <Chevron color={palette.muted} direction="right" />
    </View>
  );
}

export interface ChipsProps {
  readonly chips: readonly string[];
  readonly disabled: boolean;
  readonly onChip: (text: string) => void;
}

/** The three tiny examples under the warm-up ask. Tapping one sends it as the one thing. */
export function Chips({ chips, disabled, onChip }: ChipsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <View style={styles.chips}>
      {chips.map((chip, index) => (
        <Pressable
          key={chip}
          accessibilityRole="button"
          accessibilityLabel={chip}
          accessibilityHint={t('launch.chip.hint')}
          disabled={disabled}
          onPress={() => onChip(chip)}
          testID={`warm-up-chip-${index}`}
          style={[
            styles.chip,
            { backgroundColor: palette.surface, borderColor: `${palette.ink}14` },
          ]}
        >
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.rowLabel, { color: palette.ink, fontSize: size(SMALL_SIZE) }]}
          >
            {chip}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  choices: {
    gap: spacing.sm + 2,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  treat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontFamily: fonts.body,
  },
  treatInput: {
    flex: 1,
    minHeight: 44,
    textAlign: 'right',
    fontFamily: fonts.body,
  },
  treatInputStacked: {
    flex: 0,
    textAlign: 'left',
  },
  minutes: {
    flexDirection: 'row',
    borderRadius: radius.md + 2,
    padding: 2,
  },
  minute: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  minuteLabel: {
    fontFamily: fonts.body,
  },
  minuteChosen: {
    fontWeight: '700',
  },
  world: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 72,
    opacity: 0.55,
  },
  worldWords: {
    flex: 1,
    gap: 2,
  },
  worldTitle: {
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  chips: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
