import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { PLANS, type PlanId } from '../products';
import type { Offerings } from '../purchases-port';
import { planNote } from '../sheet-model';

import { FoilEdge } from './foil-edge';

// The sheet is a dark page in both appearances, so its inks are its own.
export const ON_NIGHT = '#FFFFFF';
export const DIM = 'rgba(255,255,255,0.7)';
const NOTE = 'rgba(255,255,255,0.75)';
const RING = 'rgba(255,255,255,0.12)';
const PLATE = '#17120F';
const CHOSEN = '#1E1915';
const CHOSEN_LABEL = '#FFB8A3';
/** The board's tile: a 20 point corner with a 2 point ring round an 18 point plate. */
const TILE = { radius: 20, ring: 2 } as const;
/** How long the foil takes to move from one plan to the next. */
const CHOOSE_MS = 300;

export interface PlanTilesProps {
  readonly offerings: Offerings;
  readonly chosen: PlanId;
  /** A purchase or a restore is with the store: no plan can be chosen meanwhile. */
  readonly busy: boolean;
  readonly onChoose: (plan: PlanId) => void;
}

/** The foil ring, its lit plate and its glow, faded in over a tile when its plan is chosen. */
function ChosenFoil({ shown }: { readonly shown: boolean }) {
  const { reducedMotion } = useScreenStyle();
  const lit = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    const to = shown ? 1 : 0;
    lit.value = reducedMotion ? to : withTiming(to, { duration: CHOOSE_MS });
  }, [shown, reducedMotion, lit]);
  const fade = useAnimatedStyle(() => ({ opacity: lit.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, fade]}>
      <FoilEdge radius={TILE.radius} edge={TILE.ring} fill={CHOSEN} style={styles.fill} />
    </Animated.View>
  );
}

/**
 * The plans the store offers, side by side, each with the store's own price. Every tile is the
 * same size with a ring round it; the chosen one's ring is foil and glows, and the foil fades from
 * one plan to the next, so choosing moves nothing. At the large text sizes they stack.
 */
export function PlanTiles({ offerings, chosen, busy, onChoose }: PlanTilesProps) {
  const t = useT();
  const { largeText, allowFontScaling, size } = useScreenStyle();
  return (
    <View accessibilityRole="radiogroup" style={[styles.plans, largeText ? styles.stacked : null]}>
      {PLANS.map((plan) => {
        const one = offerings.plans[plan];
        if (!one) return null;
        const picked = plan === chosen;
        return (
          <PressSpring
            key={plan}
            accessibilityRole="radio"
            accessibilityState={{ selected: picked, checked: picked, disabled: busy }}
            accessibilityLabel={`${t(`plus.plan.${plan}`)}, ${one.priceText}, ${planNote(one, t)}`}
            accessibilityHint={t('plus.plan.hint')}
            disabled={busy}
            onPress={() => onChoose(plan)}
            feedback="choice"
            testID={`plus-plan-${plan}`}
            style={[styles.tile, largeText ? null : styles.grow]}
          >
            <View style={styles.plate} />
            <ChosenFoil shown={picked} />
            <View style={styles.words}>
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.6}
                numberOfLines={1}
                style={[styles.label, { color: picked ? CHOSEN_LABEL : DIM, fontSize: size(13) }]}
              >
                {t(`plus.plan.${plan}`)}
              </Text>
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.5}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.price, { fontSize: size(21) }]}
                testID={`plus-price-${plan}`}
              >
                {one.priceText}
              </Text>
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.8}
                style={[styles.note, { fontSize: size(11), lineHeight: size(11) * 1.25 }]}
              >
                {planNote(one, t)}
              </Text>
            </View>
          </PressSpring>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  plans: { flexDirection: 'row', gap: spacing.sm },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  grow: { flex: 1 },
  tile: { borderRadius: TILE.radius, backgroundColor: RING },
  plate: {
    position: 'absolute',
    top: TILE.ring,
    right: TILE.ring,
    bottom: TILE.ring,
    left: TILE.ring,
    borderRadius: TILE.radius - TILE.ring,
    backgroundColor: PLATE,
  },
  glow: {
    borderRadius: TILE.radius,
    boxShadow: '0 10px 30px -10px rgba(255,143,200,0.7)',
  },
  fill: { flex: 1 },
  words: { alignItems: 'center', paddingVertical: 13, paddingHorizontal: spacing.sm, gap: 4 },
  label: { fontFamily: fonts.body, fontWeight: '700' },
  price: {
    color: ON_NIGHT,
    fontFamily: fonts.heading,
    fontWeight: '800',
    textAlign: 'center',
  },
  note: { color: NOTE, fontFamily: fonts.body, fontWeight: '500', textAlign: 'center' },
});
