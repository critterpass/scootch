import { StyleSheet, Text, View } from 'react-native';

import { CARD_MATERIALS, rgba } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { Scootch } from '../../../art/Scootch';
import { useT } from '../../../i18n/i18n-provider';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { memberNumber, STAMPED } from '../../plus/ui/member-card';
import { inkOf } from '../catalogue';
import type { Look } from '../look';

import { MaterialCard } from './material-card';

/** The board's card in the studio: 214 by 298. */
const CARD = { width: 214, height: 298 } as const;

export interface StudioCardProps {
  /** What the card wears: its finish is the stock, its ink prints Scootch. */
  readonly look: Look;
  /** The member's number, printed in the corner; `null` leaves it off. */
  readonly number: number | null;
}

/**
 * The one card in focus in the studio: Scootch, pleased with himself, printed in an ink on a
 * finish, with the finish's name and the ink's code at its foot. It reads out as one image that
 * says what it is wearing.
 */
export function StudioCard({ look, number }: StudioCardProps) {
  const t = useT();
  const character = useCharacterMotion();
  const material = CARD_MATERIALS[look.finish];
  const ink = inkOf(look.ink);
  const sub = rgba(material.sub[0], material.sub[1]);
  return (
    <MaterialCard
      finish={look.finish}
      width={CARD.width}
      height={CARD.height}
      label={t('studio.card.label', {
        finish: t(`finish.${look.finish}`),
        ink: t(ink.name),
        trail: t(`studio.trail.${look.trail}`),
      })}
      testID="studio-card"
    >
      <View style={styles.print}>
        <View style={styles.spread}>
          <Text allowFontScaling={false} style={[styles.stamp, { color: sub }]}>
            {t('brand.name').toLocaleUpperCase()}
          </Text>
          {number === null ? null : (
            <Text allowFontScaling={false} style={[styles.stamp, { color: sub }]}>
              {t('studio.card.number', { number: memberNumber(number) })}
            </Text>
          )}
        </View>
        <View style={styles.figure}>
          <Scootch mood="pleased" ink={look.ink} size={180} {...character} />
        </View>
        <View style={[styles.spread, styles.foot]}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.finish, { color: material.text }]}
          >
            {t(`finish.${look.finish}`)}
          </Text>
          <Text allowFontScaling={false} style={[styles.stamp, { color: sub }]}>
            {ink.code}
          </Text>
        </View>
      </View>
    </MaterialCard>
  );
}

const styles = StyleSheet.create({
  print: { flex: 1, padding: 16 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  foot: { alignItems: 'flex-end' },
  figure: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  stamp: { fontFamily: STAMPED, fontWeight: '700', fontSize: 9.5, letterSpacing: 1.1 },
  finish: {
    flexShrink: 1,
    fontFamily: fonts.heading,
    fontWeight: '800',
    fontSize: 19,
    letterSpacing: -0.4,
  },
});
