import { StyleSheet, Text } from 'react-native';

import { useT } from '../../../i18n/i18n-provider';
import { useScreenStyle } from '../../../ui/use-screen-style';

import { BADGE_FOIL, FoilEdge } from './foil-edge';
import { STAMPED } from './member-card';

/** The badge is printed in dark ink on its pale foil, in both appearances. */
const BADGE_INK = '#1C1A17';

/**
 * "PLUS" as the sheet writes it beside the app's name: a small tag cut from holo foil, stamped in
 * capitals. It is part of the wordmark, so it is not read out by itself.
 */
export function PlusBadge() {
  const t = useT();
  const { allowFontScaling, size } = useScreenStyle();
  return (
    <FoilEdge radius={7} colors={BADGE_FOIL} style={styles.badge}>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.4}
        accessible={false}
        style={[styles.word, { fontSize: size(10.5) }]}
      >
        {t('brand.plus').toLocaleUpperCase()}
      </Text>
    </FoilEdge>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingTop: 5, paddingBottom: 4 },
  word: { color: BADGE_INK, fontFamily: STAMPED, fontWeight: '700', letterSpacing: 1.47 },
});
