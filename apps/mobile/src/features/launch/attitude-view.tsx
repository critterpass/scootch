import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, fontSizes, radius, spacing } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { Tick } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

import { LaunchPage } from './launch-page';

const ATTITUDES = ['soft', 'cheeky', 'unhinged'] as const satisfies readonly Attitude[];
/** How each attitude's Scootch looks on its card. */
const CARD_MOODS: Record<Attitude, ScootchProps['mood']> = {
  soft: 'asleep',
  cheeky: 'scheming',
  unhinged: 'dramatic',
};
const CARD_SCOOTCH = 64;
/** The tick is white on the tomato disc, as the design draws it, in both appearances. */
const TICK_WHITE = '#FFFFFF';
const NAME_SIZE = 19;
const ABOUT_SIZE = 15;

export interface AttitudeViewProps {
  /** Scootch's question, from the offline pack. */
  readonly line: string;
  readonly selected: Attitude;
  readonly onChoose: (attitude: Attitude) => void;
  readonly onConfirm: () => void;
}

/** The only setup choice: how loud Scootch is. One card per attitude, one of them chosen. */
export function AttitudeView({ line, selected, onChoose, onConfirm }: AttitudeViewProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();

  return (
    <LaunchPage
      step={2}
      top
      testID="launch-attitude"
      footer={
        <CapsuleButton
          label={t('launch.attitude.confirm', { attitude: t(`settings.attitude.${selected}`) })}
          hint={t('launch.attitude.confirm.hint')}
          onPress={onConfirm}
          testID="launch-attitude-confirm"
        />
      }
    >
      <Text
        accessibilityRole="header"
        testID="one-sentence"
        allowFontScaling={allowFontScaling}
        style={[styles.line, { color: palette.ink, fontSize: size(fontSizes.sentence) }]}
      >
        {line}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.cards}>
        {ATTITUDES.map((attitude) => {
          const chosen = attitude === selected;
          return (
            <Pressable
              key={attitude}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t(`settings.attitude.${attitude}`)}
              accessibilityHint={t(`launch.attitude.${attitude}.about`)}
              onPress={() => onChoose(attitude)}
              testID={`launch-attitude-${attitude}`}
              style={[
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: chosen ? palette.tomato : 'transparent',
                },
              ]}
            >
              {largeText ? null : (
                <Scootch
                  mood={CARD_MOODS[attitude]}
                  attitude={attitude}
                  reducedMotion
                  size={CARD_SCOOTCH}
                />
              )}
              <View style={styles.words}>
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.name, { color: palette.ink, fontSize: size(NAME_SIZE) }]}
                >
                  {t(`settings.attitude.${attitude}`)}
                </Text>
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.about, { color: palette.muted, fontSize: size(ABOUT_SIZE) }]}
                >
                  {t(`launch.attitude.${attitude}.about`)}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  chosen
                    ? { backgroundColor: palette.tomato, borderColor: palette.tomato }
                    : { borderColor: `${palette.ink}33` },
                ]}
              >
                {chosen ? <Tick color={TICK_WHITE} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </LaunchPage>
  );
}

const styles = StyleSheet.create({
  line: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  cards: {
    gap: spacing.sm + 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.heading,
    fontWeight: '600',
  },
  about: {
    fontFamily: fonts.body,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
