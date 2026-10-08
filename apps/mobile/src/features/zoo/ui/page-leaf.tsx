import { StyleSheet, Text, View } from 'react-native';

import { CARD_LABELS } from '@scootch/art';
import type { Language } from '@scootch/i18n';
import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { STAMPED } from '../../plus/ui/member-card';
import { POCKETS, type MonthPage } from '../binder';
import type { CaughtMonster } from '../zoo-cards';

import { MonthStamp } from './month-stamp';
import { EmptyPocket, Pocket, type PocketSize } from './pocket';

/** The leaf is the binder's own paper in both appearances, with its spine down the leading edge. */
export const LEAF = { paper: '#E9DFCF', spine: '#D9CDB9', ink: '#1C1A17', sub: '#6F6A62' } as const;
/** How wide the spine is, with its three holes. */
export const LEAF_SPINE = 22;
/** Where the three holes sit down the spine, as shares of the leaf's height. */
const HOLES = [0.14, 0.5, 0.86] as const;
const GAP = 8;

export interface PageLeafProps {
  readonly page: MonthPage;
  /** "September". */
  readonly monthName: string;
  readonly language: Language;
  readonly pocketWidth: number;
  readonly pocketSize: PocketSize;
  readonly onOpen: (monster: CaughtMonster) => void;
}

/**
 * What is on one leaf of the binder: its spine and three holes, the month and how full it is,
 * nine pockets (the empty ones are sleeves with nothing in them yet), and the foil stamp once
 * all nine are filled. A tap on a card takes it out.
 */
export function PageLeaf(props: PageLeafProps) {
  const { page, monthName, language, pocketWidth, pocketSize } = props;
  const t = useT();
  const labels = CARD_LABELS[language];
  const empty = POCKETS - page.cards.length;
  return (
    <>
      <View style={styles.spine} />
      {HOLES.map((share) => (
        <View key={share} style={[styles.hole, { top: `${share * 100}%` }]} />
      ))}
      <View style={styles.head}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.month}
          testID="binder-page-month"
        >
          {monthName}
        </Text>
        <Text allowFontScaling={false} style={styles.fill}>
          {t('binder.page.fill', { count: Math.min(POCKETS, page.caught), of: POCKETS })}
        </Text>
      </View>
      <View style={styles.pockets}>
        {page.cards.map((monster) => (
          <PressSpring
            key={monster.id}
            accessibilityRole="button"
            accessibilityLabel={`${monster.name}, ${labels.rarity[monster.rarity]}`}
            accessibilityHint={t('zoo.card.hint')}
            onPress={() => props.onOpen(monster)}
            testID={`binder-page-pocket-${monster.number}`}
          >
            <Pocket
              rarity={monster.rarity}
              spec={monster.spec}
              name={monster.name}
              width={pocketWidth}
              size={pocketSize}
            />
          </PressSpring>
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <EmptyPocket key={`empty-${index}`} width={pocketWidth} size={pocketSize} />
        ))}
      </View>
      {page.complete ? (
        <MonthStamp
          month={monthName}
          word={t('binder.page.complete')}
          count={t('binder.caught', { count: page.caught })}
          landsOn={page.month}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: LEAF_SPINE,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: LEAF.spine,
  },
  hole: {
    position: 'absolute',
    left: 6,
    width: 10,
    height: 10,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: '#F6F3EE',
    boxShadow: 'inset 0 1px 2px rgba(28,26,23,0.4)',
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  month: {
    flexShrink: 1,
    color: LEAF.ink,
    fontFamily: fonts.heading,
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: -0.44,
  },
  fill: {
    color: LEAF.sub,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 1.26,
  },
  pockets: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
