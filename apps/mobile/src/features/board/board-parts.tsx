import type { SkTypeface } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PhuMood } from '@phusclass/art/class';
import { fonts } from '@phusclass/tokens';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { BOARD, CHALK } from './chalk';
import { PhuFigure } from './phu-figure';

/** One of the pills under the heading. */
function BoardPill({
  id,
  label,
  onPress,
}: {
  readonly id: string;
  readonly label: string;
  readonly onPress: () => void;
}) {
  const { size, allowFontScaling } = useScreenStyle();
  return (
    <Pressable
      testID={id}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed ? styles.pressed : null]}
    >
      <Text allowFontScaling={allowFontScaling} style={[styles.pillText, { fontSize: size(14) }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** "The board", the date in the corner, and the ways to the timetable and the logbook. */
export function BoardHeading({
  dateLine,
  onTimetable,
  onLogbook,
}: {
  readonly dateLine: string;
  readonly onTimetable: () => void;
  readonly onLogbook: () => void;
}) {
  const t = useT();
  const { size, allowFontScaling, largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 14 }]}>
      <View style={[styles.titleLine, largeText ? styles.titleLineLarge : null]}>
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[styles.title, { fontSize: size(34) }]}
        >
          {t('board.title')}
        </Text>
        <Text allowFontScaling={allowFontScaling} style={[styles.dateLine, { fontSize: size(18) }]}>
          {dateLine}
        </Text>
      </View>
      <View style={styles.pills}>
        <BoardPill id="board-timetable" label={t('board.timetable')} onPress={onTimetable} />
        <BoardPill id="board-logbook" label={t('board.logbook')} onPress={onLogbook} />
      </View>
    </View>
  );
}

/** The foot of the board: his one line, and him. */
export function BoardFoot({
  remark,
  mood,
  hand,
}: {
  readonly remark: string | null;
  readonly mood: PhuMood;
  readonly hand: SkTypeface | null;
}) {
  const { mayMove } = useFeel();
  const { size, allowFontScaling, largeText } = useScreenStyle();
  return (
    <View style={[styles.foot, largeText ? styles.footLarge : null]}>
      {remark === null ? (
        <View style={styles.fill} />
      ) : (
        <Animated.Text
          key={remark}
          testID="board-remark"
          accessibilityLiveRegion="polite"
          {...(mayMove ? { entering: FadeIn.duration(240) } : {})}
          allowFontScaling={allowFontScaling}
          style={[
            styles.remark,
            largeText ? styles.remarkLarge : null,
            { fontSize: size(18), lineHeight: size(18) * 1.3 },
          ]}
        >
          {remark}
        </Animated.Text>
      )}
      <View
        style={styles.figure}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <PhuFigure mood={mood} width={BOARD.figure} hand={hand} />
      </View>
    </View>
  );
}

/** The wooden ledge's look; the screen gives it its gesture and its tap. */
export function LedgeHandle() {
  return (
    <View style={styles.ledge}>
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 12,
  },
  titleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  titleLineLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    color: CHALK.white,
    fontFamily: fonts.body,
    fontWeight: '800',
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  dateLine: {
    color: CHALK.date,
    fontFamily: HAND_FAMILY,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: CHALK.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  pillText: {
    color: CHALK.white,
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 20,
  },
  footLarge: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  remark: {
    flex: 1,
    marginBottom: 22,
    color: CHALK.white,
    fontFamily: fonts.heading,
    fontWeight: '800',
  },
  remarkLarge: {
    flex: 0,
    marginBottom: 8,
    marginTop: 8,
  },
  figure: {
    marginBottom: -8,
    alignSelf: 'flex-end',
  },
  ledge: {
    height: BOARD.ledge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: CHALK.handle,
  },
});
