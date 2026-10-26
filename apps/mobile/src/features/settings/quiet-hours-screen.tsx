import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { goBack } from '../../ui/motion/go-back';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { DEFAULT_QUIET, type QuietHours } from '../notes/notes-plan';
import { clockText, readNotesSettings, writeNotesSettings } from '../notes/notes-settings';

import { Foot, Group, TITLE_MAX_SCALE, titleSize, usePage } from './settings-parts';

/** Quiet hours move in half hours. */
const STEP = 30;
const DAY = 24 * 60;

const moved = (minute: number, by: number) => (minute + by + DAY) % DAY;

function Stepper({
  label,
  minute,
  onChange,
  first,
  testID,
}: {
  readonly label: string;
  readonly minute: number;
  readonly onChange: (next: number) => void;
  readonly first: boolean;
  readonly testID: string;
}) {
  const t = useT();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const button = (text: string, by: number, id: string) => (
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
      style={[
        styles.row,
        largeText && styles.rowStacked,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${palette.ink}14` },
      ]}
    >
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: clockText(minute) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          onChange(moved(minute, event.nativeEvent.actionName === 'increment' ? STEP : -STEP))
        }
        style={styles.labelBox}
      >
        <Text
          allowFontScaling={allowFontScaling}
          style={{ color: palette.ink, fontSize: size(16) }}
        >
          {label}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.time, { color: palette.ink, fontSize: size(28) }]}
          testID={`${testID}-value`}
        >
          {clockText(minute)}
        </Text>
      </View>
      <View style={styles.steps}>
        {button(t('settings.quiet.earlier'), -STEP, 'earlier')}
        {button(t('settings.quiet.later'), STEP, 'later')}
      </View>
    </View>
  );
}

/** Quiet hours: when no note comes home. Sleep and Focus are the system's, and always respected. */
export function QuietHoursScreen() {
  const t = useT();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const page = usePage();
  const [quiet, setQuiet] = useState<QuietHours>(DEFAULT_QUIET);

  useEffect(() => {
    let current = true;
    void readNotesSettings(db).then((stored) => {
      if (current) setQuiet(stored.quiet);
    });
    return () => {
      current = false;
    };
  }, [db]);

  const change = (next: QuietHours) => {
    setQuiet(next);
    void writeNotesSettings(db, { quiet: next });
  };

  return (
    <ScrollView
      style={{ backgroundColor: page }}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      testID="settings-quiet"
    >
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={TITLE_MAX_SCALE}
        style={[styles.title, { color: palette.ink, fontSize: titleSize(size, 28) }]}
      >
        {t('settings.notes.quiet')}
      </Text>
      <Group>
        <Stepper
          first
          label={t('settings.quiet.from')}
          minute={quiet.from}
          onChange={(from) => change({ ...quiet, from })}
          testID="quiet-from"
        />
        <Stepper
          first={false}
          label={t('settings.quiet.to')}
          minute={quiet.to}
          onChange={(to) => change({ ...quiet, to })}
          testID="quiet-to"
        />
      </Group>
      <Foot>{t('settings.quiet.foot')}</Foot>
      <CapsuleButton
        label={t('settings.done')}
        hint={t('settings.back.hint')}
        onPress={() => goBack(router, '/settings')}
        testID="quiet-done"
        style={styles.done}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { marginHorizontal: 20, marginBottom: 18, fontWeight: '800', letterSpacing: -0.5 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'stretch' },
  labelBox: { flex: 1, gap: 2 },
  time: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  steps: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  step: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontWeight: '600' },
  done: { marginTop: 24, marginHorizontal: 16 },
});
