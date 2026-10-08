import { StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, shadows, spacing } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import { GROUP_RADIUS, Note } from './rows';

const ATTITUDES = ['soft', 'cheeky', 'unhinged'] as const satisfies readonly Attitude[];
/** How Scootch stands for each attitude, as the board draws the three. */
const MOODS: Record<Attitude, ScootchProps['mood']> = {
  soft: 'asleep',
  cheeky: 'scheming',
  unhinged: 'dramatic',
};

export interface AttitudeDialProps {
  readonly attitude: Attitude;
  readonly onChoose: (attitude: Attitude) => void;
}

/**
 * The attitude dial: Scootch three ways, side by side on one card, with the chosen one on the
 * page's colour inside a tomato ring, and under the card what that attitude does. At the large
 * text sizes the three stack and are named without their pictures.
 */
export function AttitudeDial({ attitude: chosenAttitude, onChoose }: AttitudeDialProps) {
  const t = useT();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
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
        testID="settings-attitude"
      >
        {ATTITUDES.map((attitude) => {
          const chosen = attitude === chosenAttitude;
          return (
            <PressSpring
              key={attitude}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t(`settings.attitude.${attitude}`)}
              accessibilityHint={t(`settings.attitude.${attitude}.note`)}
              onPress={() => onChoose(attitude)}
              feedback="choice"
              testID={`settings-attitude-${attitude}`}
              style={[
                styles.card,
                chosen
                  ? { backgroundColor: palette.page, borderColor: palette.tomato }
                  : styles.unchosen,
              ]}
            >
              {largeText ? null : (
                <Scootch mood={MOODS[attitude]} attitude={attitude} reducedMotion size={78} />
              )}
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.name,
                  { color: palette.ink, fontSize: size(15), fontWeight: chosen ? '600' : '500' },
                ]}
              >
                {t(`settings.attitude.${attitude}`)}
              </Text>
            </PressSpring>
          );
        })}
      </View>
      <Note text={t(`settings.attitude.${chosenAttitude}.note`)} testID="settings-attitude-note" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { fontFamily: fonts.body, marginLeft: spacing.md, letterSpacing: 0.3 },
  dial: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    borderRadius: GROUP_RADIUS,
    boxShadow: shadows.card,
  },
  stacked: { flexDirection: 'column' },
  // The chosen attitude sits on the page's colour inside a tomato ring. The ring is always there,
  // clear on the other two, so choosing one moves nothing.
  card: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: 6,
    paddingBottom: 10,
    borderWidth: 2,
    borderRadius: 20,
  },
  unchosen: { borderColor: 'transparent' },
  name: { fontFamily: fonts.body, textAlign: 'center' },
});
