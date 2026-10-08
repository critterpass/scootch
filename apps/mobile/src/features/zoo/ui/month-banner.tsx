import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { Lock } from '../../plus/ui/parts';
import { POCKETS } from '../binder';

export interface MonthBannerProps {
  /** "October page". */
  readonly title: string;
  /** "7 of 9 pockets. Two more and it gets stamped." */
  readonly note: string;
  /** How many of the nine pockets are filled. */
  readonly filled: number;
  /** The month pages are Plus: without it the banner wears a small lock. */
  readonly locked: boolean;
  readonly hint: string;
  readonly onPress?: () => void;
}

/**
 * This month's page, in one row on the shelf: its name, how full it is, and nine tiny pockets
 * that fill in tomato as the month goes. A tap opens the pages.
 */
export function MonthBanner({ title, note, filled, locked, hint, onPress }: MonthBannerProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${note}`}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      testID="binder-month"
      style={[styles.banner, { backgroundColor: palette.surface }]}
    >
      <View style={styles.words}>
        <View style={styles.titleRow}>
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.5}
            style={[styles.title, { color: palette.ink, fontSize: size(15) }]}
          >
            {title}
          </Text>
          {locked ? <Lock color={palette.muted} /> : null}
        </View>
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.8}
          style={[
            styles.note,
            { color: palette.muted, fontSize: size(12), lineHeight: size(12) * 1.2 },
          ]}
        >
          {note}
        </Text>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: POCKETS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pocket,
              { backgroundColor: index < filled ? palette.tomato : `${palette.ink}1F` },
            ]}
          />
        ))}
      </View>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    boxShadow: '0 0 0 0.5px rgba(28,26,23,0.06)',
  },
  words: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.heading, fontWeight: '800' },
  note: { fontFamily: fonts.body },
  // Three across: three 10 point pockets and the two gaps between them.
  grid: { width: 36, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  pocket: { width: 10, height: 13, borderRadius: 2.5 },
});
