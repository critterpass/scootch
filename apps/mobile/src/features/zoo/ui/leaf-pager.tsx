import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../../ui/buttons';
import { Chevron } from '../../../ui/icons';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';

export interface LeafPagerProps {
  /** Which leaf of the month is open, from 1, and how many the month runs to. */
  readonly leaf: number;
  readonly of: number;
  /** "October", read out with the count. */
  readonly monthName: string;
  /** Turns back a leaf. Unset at the front cover: the arrow rests. */
  readonly onBack?: () => void;
  /** Turns on a leaf. Unset at the back cover. */
  readonly onOn?: () => void;
}

/**
 * The binder's pager, in the dock beside the one action: an arrow either way and, between them,
 * which leaf of the month this is. The arrows leaf on through the months; at a cover one rests.
 */
export function LeafPager({ leaf, of, monthName, onBack, onOn }: LeafPagerProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const arrow = (to: 'left' | 'right', onPress: (() => void) | undefined) => (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={t(to === 'left' ? 'binder.leaf.back' : 'binder.leaf.on')}
      accessibilityHint={t(to === 'left' ? 'binder.leaf.back.hint' : 'binder.leaf.on.hint')}
      accessibilityState={{ disabled: onPress === undefined }}
      disabled={onPress === undefined}
      onPress={onPress}
      feedback="choice"
      restOpacity={onPress === undefined ? 0.3 : 1}
      hitSlop={6}
      testID={to === 'left' ? 'binder-leaf-back' : 'binder-leaf-on'}
      style={styles.arrow}
    >
      <Chevron color={palette.ink} direction={to} />
    </PressSpring>
  );
  return (
    <View
      testID="binder-leaf-pager"
      style={[styles.pager, { backgroundColor: `${palette.ink}0F` }]}
    >
      {arrow('left', onBack)}
      <Text
        accessibilityLabel={t('binder.leaf.spoken', { month: monthName, page: leaf, of })}
        accessibilityLiveRegion="polite"
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
        testID="binder-leaf-count"
        style={[styles.count, { color: palette.ink, fontSize: size(16) }]}
      >
        {t('binder.leaf', { page: leaf, of })}
      </Text>
      {arrow('right', onOn)}
    </View>
  );
}

const styles = StyleSheet.create({
  pager: {
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  arrow: {
    width: CONTROL_HEIGHT - 8,
    height: CONTROL_HEIGHT - 8,
    borderRadius: (CONTROL_HEIGHT - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    minWidth: 52,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
