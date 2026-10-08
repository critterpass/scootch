import { StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Note } from './rows';

const ATTITUDES = ['soft', 'cheeky', 'unhinged'] as const satisfies readonly Attitude[];
const CARD_MOODS: Record<Attitude, ScootchProps['mood']> = {
  soft: 'asleep',
  cheeky: 'waiting',
  unhinged: 'stuck',
};

/** The attitude dial at the head of Settings: three cards, and a note on the one that is chosen. */
export function AttitudeDial({
  attitude,
  onChange,
}: {
  readonly attitude: Attitude;
  readonly onChange: (attitude: Attitude) => void;
}) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[styles.heading, { color: palette.muted, fontSize: size(13) }]}
      >
        {t('settings.attitude').toLocaleUpperCase()}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={[styles.dial, largeText && styles.stacked, { backgroundColor: palette.surface }]}
      >
        {ATTITUDES.map((one) => {
          const chosen = one === attitude;
          return (
            <PressSpring
              key={one}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t(`settings.attitude.${one}`)}
              accessibilityHint={t(`settings.attitude.${one}.note`)}
              onPress={() => onChange(one)}
              feedback="choice"
              testID={`settings-attitude-${one}`}
              style={[styles.card, { borderColor: chosen ? palette.tomato : 'transparent' }]}
            >
              {largeText ? null : (
                <Scootch mood={CARD_MOODS[one]} attitude={one} reducedMotion size={72} />
              )}
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.cardName,
                  { color: palette.ink, fontSize: size(17), fontWeight: chosen ? '700' : '400' },
                ]}
              >
                {t(`settings.attitude.${one}`)}
              </Text>
            </PressSpring>
          );
        })}
      </View>
      <Note text={t(`settings.attitude.${attitude}.note`)} testID="settings-attitude-note" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { fontFamily: fonts.body, marginLeft: spacing.md, letterSpacing: 0.3 },
  dial: { flexDirection: 'row', gap: 6, padding: 12, borderRadius: radius.lg },
  stacked: { flexDirection: 'column' },
  card: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  cardName: { fontFamily: fonts.body, textAlign: 'center' },
});
