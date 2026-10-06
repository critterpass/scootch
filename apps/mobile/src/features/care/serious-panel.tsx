import { StyleSheet, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ChoiceDock, Headed, QuietLink, Stack } from '../dump/dump-panels';
import { Row } from '../settings/rows';

export interface SeriousPanelProps {
  readonly taskText: string;
  /** The task's own plain words, from its stored lines or the offline pack's plain ones. */
  readonly said: string | null;
  /** One tiny step, from the same lines. `null` leaves the row out. */
  readonly tinyStep: string | null;
  /** The time a reminder would be set for, as the phone writes times; `null` in quiet hours. */
  readonly reminderTime: string | null;
  /** A reminder is already set for this time. */
  readonly remindedAt: string | null;
  readonly onTinyStep: () => void;
  readonly onRemind: () => void;
  readonly onBeFunny: () => void;
}

/**
 * "Just this, today": a serious task in plain words. No monster, no joke, no reveal; a tiny step,
 * a reminder if asked for, and the quiet way back to comedy for someone who wants it.
 */
export function SeriousPanel({
  taskText,
  said,
  tinyStep,
  reminderTime,
  remindedAt,
  onTinyStep,
  onRemind,
  onBeFunny,
}: SeriousPanelProps) {
  const { palette } = useScreenStyle();
  const t = useT();
  return (
    <Stack>
      <Headed label={t('dump.justThis')} heading={taskText} said={said} testID="serious-task" />
      <View style={[styles.group, { backgroundColor: palette.surface }]}>
        {tinyStep === null ? null : (
          <Row
            first
            label={tinyStep}
            sub={t('care.serious.tinyStep.sub')}
            hint={t('care.serious.tinyStep.hint')}
            onPress={onTinyStep}
            testID="serious-tiny-step"
          />
        )}
        {remindedAt !== null ? (
          <Row
            first={tinyStep === null}
            kind="fact"
            label={t('care.serious.reminded', { time: remindedAt })}
            testID="serious-reminded"
          />
        ) : reminderTime !== null ? (
          <Row
            first={tinyStep === null}
            label={t('care.serious.remind', { time: reminderTime })}
            hint={t('care.serious.remind.hint')}
            onPress={onRemind}
            testID="serious-remind"
          />
        ) : null}
      </View>
      <QuietLink
        label={t('care.serious.beFunny')}
        hint={t('care.serious.beFunny.hint')}
        onPress={onBeFunny}
        testID="serious-be-funny"
      />
    </Stack>
  );
}

export interface SeriousDockProps {
  readonly onNotToday: () => void;
  readonly onSit: () => void;
}

/** The two choices under a serious task: leave it, or sit quietly with it. */
export function SeriousDock({ onNotToday, onSit }: SeriousDockProps) {
  const t = useT();
  return (
    <ChoiceDock
      quiet={{
        label: t('care.serious.notToday'),
        hint: t('care.serious.notToday.hint'),
        onPress: onNotToday,
        testID: 'serious-not-today',
      }}
      action={{
        label: t('care.serious.sit'),
        hint: t('care.serious.sit.hint'),
        onPress: onSit,
        testID: 'serious-sit',
      }}
    />
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 22, overflow: 'hidden' },
});
