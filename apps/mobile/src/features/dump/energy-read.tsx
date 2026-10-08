import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Energy } from '@scootch/domain';
import { fonts, shadows, spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { CapsuleButton, GlassDock } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { GROUP_RADIUS } from '../settings/rows';

/** The battery question as the board sets it: 30 on a line of 1.14, over rows of 17. */
const ASK_SIZE = 30;
const ASK_LINE = 1.14;
const ROW_SIZE = 17;
/** How full each answer's battery is drawn. */
const CHARGE: Readonly<Record<Energy, `${number}%`>> = { low: '25%', medium: '60%', fine: '100%' };
/** The body stands in the words' gutter of 28; the board draws this card 16 from the edge. */
const CARD_OUTSET = -12;

const ENERGIES: readonly Energy[] = ['low', 'medium', 'fine'];

/** A small battery, as full as the answer beside it. Only the low one is in tomato. */
function Battery({ energy }: { readonly energy: Energy }) {
  const { palette } = useScreenStyle();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.battery, { borderColor: palette.ink }]}
    >
      <View
        style={[
          styles.charge,
          {
            width: CHARGE[energy],
            backgroundColor: energy === 'low' ? palette.tomato : palette.ink,
          },
        ]}
      />
    </View>
  );
}

/**
 * The battery question: one card of three answers, each with its battery. The answer tapped is
 * ticked as it is taken. The fourth way, letting Scootch guess, is in the dock: `EnergyGuess`.
 */
export function EnergyRead({
  onAnswer,
}: {
  readonly onAnswer: (energy: Energy | 'guess') => void;
}) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { language } = useLanguage();
  const t = useT();
  const [taken, setTaken] = useState<Energy | null>(null);
  // Vietnamese stacks its marks: its headline gets a line of at least 1.2.
  const askLine = language === 'vi' ? Math.max(ASK_LINE, 1.2) : ASK_LINE;
  return (
    <View testID="energy-read" style={styles.energy}>
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[
          styles.ask,
          { color: palette.ink, fontSize: size(ASK_SIZE), lineHeight: size(ASK_SIZE) * askLine },
        ]}
      >
        {t('energy.ask')}
      </Text>
      <View style={[styles.energyCard, { backgroundColor: palette.surface }]}>
        <View accessibilityRole="radiogroup" style={styles.energyRows}>
          {ENERGIES.map((energy, index) => (
            <PressSpring
              key={energy}
              accessibilityRole="radio"
              accessibilityLabel={t(`energy.${energy}`)}
              accessibilityHint={t('energy.hint')}
              accessibilityState={{ selected: taken === energy }}
              onPress={() => {
                setTaken(energy);
                onAnswer(energy);
              }}
              testID={`energy-${energy}`}
              feedback="choice"
              style={[
                styles.energyRow,
                index > 0 && {
                  borderTopColor: `${palette.ink}1F`,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Battery energy={energy} />
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.energyLabel, { color: palette.ink, fontSize: size(ROW_SIZE) }]}
              >
                {t(`energy.${energy}`)}
              </Text>
              {taken === energy ? (
                <View style={[styles.taken, { backgroundColor: palette.tomato }]}>
                  <View style={styles.takenTick} />
                </View>
              ) : null}
            </PressSpring>
          ))}
        </View>
      </View>
    </View>
  );
}

/** The dock under the battery question: Scootch guesses from how the words were written. */
export function EnergyGuess({ onGuess }: { readonly onGuess: () => void }) {
  const t = useT();
  return (
    <GlassDock>
      <CapsuleButton
        label={t('energy.guess')}
        hint={t('energy.hint')}
        tone="quiet"
        onPress={onGuess}
        testID="energy-guess"
      />
    </GlassDock>
  );
}

const styles = StyleSheet.create({
  energy: { gap: 22 },
  ask: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.6 },
  // The board's card: a 26 point corner with a wide, faint drop. The drop is on the outer box,
  // since a box that clips its rows would clip its own shadow too.
  energyCard: {
    borderRadius: GROUP_RADIUS,
    boxShadow: shadows.card,
    marginHorizontal: CARD_OUTSET,
  },
  energyRows: { borderRadius: GROUP_RADIUS, overflow: 'hidden' },
  energyRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  energyLabel: { flex: 1, fontFamily: fonts.body },
  // Two points between the case's edge and the charge: the line itself, and half a point more.
  battery: { width: 26, height: 13, borderRadius: 4, borderWidth: 1.5, padding: 0.5 },
  charge: { height: '100%', borderRadius: 1.5 },
  taken: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White on tomato on both pages, as the board draws the chosen row's mark.
  takenTick: {
    width: 8,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }, { translateX: 1 }, { translateY: -1 }],
  },
});
