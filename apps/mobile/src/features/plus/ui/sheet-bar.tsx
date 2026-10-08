import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';

import { ON_NIGHT } from './plan-tiles';
import { PlusBadge } from './plus-badge';

/**
 * The top of the sheet: the app's name with its foil PLUS badge, read out as one heading, and the
 * round close control in the trailing corner.
 */
export function SheetBar({ onClose }: { readonly onClose: () => void }) {
  const t = useT();
  const { allowFontScaling, size } = useScreenStyle();
  return (
    <View style={styles.bar}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${t('brand.name')} ${t('brand.plus')}`}
        style={styles.mark}
      >
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.4}
          style={[styles.name, { fontSize: size(20) }]}
        >
          {t('brand.name')}
        </Text>
        <PlusBadge />
      </View>
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={t('session.notNow')}
        accessibilityHint={t('plus.close.hint')}
        onPress={onClose}
        testID="plus-sheet-close"
        style={styles.close}
      >
        <View style={styles.cross}>
          <View style={[styles.stroke, styles.down]} />
          <View style={[styles.stroke, styles.up]} />
        </View>
      </PressSpring>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { color: ON_NIGHT, fontFamily: fonts.heading, fontWeight: '800', letterSpacing: -0.4 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  stroke: {
    position: 'absolute',
    width: 2.2,
    height: 16,
    borderRadius: 1,
    backgroundColor: ON_NIGHT,
  },
  down: { transform: [{ rotate: '45deg' }] },
  up: { transform: [{ rotate: '-45deg' }] },
});
