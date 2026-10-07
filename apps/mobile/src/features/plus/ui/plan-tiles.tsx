import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { SessionText } from '../../session/ui/session-text';
import { PLANS, type PlanId } from '../products';
import type { Offerings } from '../purchases-port';
import { planNote } from '../sheet-model';

import { FoilEdge } from './foil-edge';

// The sheet is a dark page in both appearances, so its inks are its own.
export const ON_NIGHT = '#FFFFFF';
export const DIM = 'rgba(255,255,255,0.7)';
const TILE = 'rgba(255,255,255,0.07)';
const TILE_EDGE = 'rgba(255,255,255,0.12)';
const CHOSEN = '#1E1915';
const CHOSEN_LABEL = '#FFB8A3';

export interface PlanTilesProps {
  readonly offerings: Offerings;
  readonly chosen: PlanId;
  /** A purchase or a restore is with the store: no plan can be chosen meanwhile. */
  readonly busy: boolean;
  readonly onChoose: (plan: PlanId) => void;
}

/**
 * The plans the store offers, side by side, each with the store's own price. The chosen one is
 * edged in foil. At the large text sizes they stack.
 */
export function PlanTiles({ offerings, chosen, busy, onChoose }: PlanTilesProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  return (
    <View accessibilityRole="radiogroup" style={[styles.plans, largeText ? styles.stacked : null]}>
      {PLANS.map((plan) => {
        const one = offerings.plans[plan];
        if (!one) return null;
        const picked = plan === chosen;
        const words = (
          <>
            <SessionText face="caption" color={picked ? CHOSEN_LABEL : DIM}>
              {t(`plus.plan.${plan}`)}
            </SessionText>
            <SessionText face="action" color={ON_NIGHT} testID={`plus-price-${plan}`}>
              {one.priceText}
            </SessionText>
            <SessionText face="caption" color={picked ? ON_NIGHT : DIM}>
              {planNote(one, t)}
            </SessionText>
          </>
        );
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
            style={largeText ? null : styles.grow}
          >
            {picked ? (
              <FoilEdge radius={radius.lg + 4} fill={CHOSEN} style={styles.plan}>
                {words}
              </FoilEdge>
            ) : (
              <View style={[styles.plan, styles.tile]}>{words}</View>
            )}
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
  plan: {
    borderRadius: radius.lg + 4,
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  tile: { backgroundColor: TILE, borderWidth: 1, borderColor: TILE_EDGE },
});
