import { ScrollView, StyleSheet, Text } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { onInkOf } from '../../../ui/buttons';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import { SHELF_SORTS, sortNeedsPlus, type ShelfSort } from '../binder';

/** The tag's pale tomato on the chosen chip, where the plain tomato would not read on ink. */
const TAG_ON_INK = '#FFB8A3';

export interface SortChipsProps {
  readonly sort: ShelfSort;
  /** Without Plus the three binder orders wear their tag and a tap on one asks about Plus. */
  readonly plus: boolean;
  readonly onSort: (sort: ShelfSort) => void;
}

/**
 * The order of the shelf, as a row of chips: Newest is everyone's, and Longest, Fastest and
 * Rarest are tagged Plus until it is on. The chosen one is filled with ink.
 */
export function SortChips({ sort, plus, onSort }: SortChipsProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('zoo.sort')}
      style={styles.strip}
      contentContainerStyle={styles.row}
    >
      {SHELF_SORTS.map((one) => {
        const on = one === sort;
        const tagged = sortNeedsPlus(one) && !plus;
        return (
          <PressSpring
            key={one}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={
              tagged ? `${t(`binder.sort.${one}`)}, ${t('brand.plus')}` : t(`binder.sort.${one}`)
            }
            accessibilityHint={tagged ? t('keep.plusOnly.hint') : t('zoo.sort.hint')}
            onPress={() => onSort(one)}
            feedback="choice"
            hitSlop={{ top: 6, bottom: 6 }}
            testID={`binder-sort-${one}`}
            style={[styles.chip, { backgroundColor: on ? palette.ink : palette.surface }]}
          >
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.5}
              style={[
                styles.word,
                {
                  color: on ? onInkOf(palette) : palette.ink,
                  fontSize: size(12.5),
                  fontWeight: on ? '600' : '500',
                },
              ]}
            >
              {t(`binder.sort.${one}`)}
            </Text>
            {tagged ? (
              <Text
                allowFontScaling={false}
                style={[styles.tag, { color: on ? TAG_ON_INK : palette.tomato }]}
              >
                {t('brand.plus').toLocaleUpperCase()}
              </Text>
            ) : null}
          </PressSpring>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The row runs to the screen's edges, past the shelf's own margin.
  strip: { marginHorizontal: -18 },
  row: { paddingHorizontal: 18, gap: 6 },
  chip: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    boxShadow: '0 0 0 0.5px rgba(28,26,23,0.14)',
  },
  word: { fontFamily: fonts.body },
  tag: { fontFamily: STAMPED, fontWeight: '700', fontSize: 7, letterSpacing: 0.56 },
});
