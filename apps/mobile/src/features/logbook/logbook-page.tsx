import type { SkTypeface } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@phusclass/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PAPER, type PaperInks } from '../board/chalk';
import { PhuFigure } from '../board/phu-figure';

import { LogbookLine } from './logbook-line';
import type { LogbookRow } from './logbook-rows';

const LINE = 44;
const MARGIN = 56;
const HOLES = 11;

export interface LogbookPageProps {
  readonly rows: readonly LogbookRow[];
  readonly week: number;
  readonly hand: SkTypeface | null;
  /** The handle at the foot: its gesture and tap belong to whoever shows the page. */
  readonly handle?: ReactNode;
  /** Shown over the page while it is pulled down from the board. */
  readonly hint?: ReactNode;
  readonly testID?: string;
}

/**
 * The sổ đầu bài: a ruled page with a red margin, finished tasks newest first, each with the day
 * in the margin, the period, his comment in red and his signature. No totals and no averages.
 */
export function LogbookPage({ rows, week, hand, handle, hint, testID }: LogbookPageProps) {
  const t = useT();
  const ink: PaperInks = PAPER[useAppearance()];
  const { size, allowFontScaling, largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const empty = rows.length === 0;

  return (
    <View style={[styles.page, { backgroundColor: ink.page }]} testID={testID}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 30 }, (_, n) => (
          <View key={n} style={[styles.rule, { top: 30 + n * LINE, backgroundColor: ink.rule }]} />
        ))}
        <View style={[styles.margin, { backgroundColor: ink.margin }]} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 16, paddingBottom: 140 }}
      >
        <View style={[styles.header, largeText ? styles.headerLarge : null]}>
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.title, { color: ink.ink, fontSize: size(34) }]}
          >
            {t('logbook.title')}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.week, { color: ink.muted, fontSize: size(13) }]}
          >
            {t('logbook.week', { week })}
          </Text>
        </View>
        {empty ? (
          <View style={styles.empty} testID="logbook-empty">
            <PhuFigure mood="grading" width={120} hand={hand} />
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.emptyTitle, { color: ink.ink, fontSize: size(19) }]}
            >
              {t('logbook.empty.title')}
            </Text>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.emptyBody, { color: ink.body, fontSize: size(14.5) }]}
            >
              {t('logbook.empty.body')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map((row, index) => (
              <LogbookLine key={row.id} row={row} index={index} ink={ink} />
            ))}
          </View>
        )}
      </ScrollView>
      {hint}
      <View
        pointerEvents="none"
        style={[styles.holes, { bottom: Math.max(insets.bottom, 14) + 50 }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: HOLES }, (_, n) => (
          <View key={n} style={[styles.hole, { backgroundColor: ink.hole }]} />
        ))}
      </View>
      <View style={[styles.handleSlot, { bottom: Math.max(insets.bottom, 14) }]}>{handle}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    overflow: 'hidden',
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  margin: {
    position: 'absolute',
    left: MARGIN,
    top: 0,
    bottom: 0,
    width: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingLeft: MARGIN + 16,
    paddingRight: 22,
  },
  headerLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: fonts.body,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  week: {
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  empty: {
    marginTop: 90,
    alignItems: 'center',
    gap: 6,
    paddingLeft: 70,
    paddingRight: 30,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    textAlign: 'center',
    lineHeight: 21,
  },
  list: {
    marginTop: 22,
  },
  holes: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  hole: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  handleSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
