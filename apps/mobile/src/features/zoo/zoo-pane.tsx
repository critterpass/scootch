import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { CARD_LABELS } from '@scootch/art';
import type { Id } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { EdgeFade } from '../../ui/edge-fade';
import { SendIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { CAUGHT, mix, presence, ramp, useKeepMotion, WORLD } from '../keep/keep-motion';
import { PaneHead } from '../keep/pane-head';
import { SessionText } from '../session/ui/session-text';

import {
  POCKETS,
  pocketStat,
  sortNeedsPlus,
  type MonthPage,
  type ShelfSort,
  type WildOne,
} from './binder';
import { Dealt, useDealtShelf } from './ui/dealt-shelf';
import { MonthBanner } from './ui/month-banner';
import { Pocket, SHELF_POCKET } from './ui/pocket';
import { SortChips } from './ui/sort-chips';
import { WildPocket } from './ui/wild-pocket';
import type { CaughtMonster } from './zoo-cards';

export interface ZooModel {
  /** Every caught card, in the order the shelf is in. */
  readonly cards: readonly CaughtMonster[];
  /** The monsters hatched and not caught yet, waiting in their pockets after the cards. */
  readonly wild: readonly WildOne[];
  readonly language: Language;
  readonly plus: boolean;
  readonly sort: ShelfSort;
  /** This month's page, for the row above the shelf. */
  readonly month: MonthPage;
  /** The card last taken out of its pocket: it wears a ring and the shelf scrolls to it. */
  readonly lastLooked: Id | null;
}

export interface ZooActions {
  readonly openCard: (monster: CaughtMonster) => void;
  readonly sort: (sort: ShelfSort) => void;
  /** Opens the month pages. Set only with Plus. */
  readonly openPages?: () => void;
  /** A locked control was tapped: the Plus sheet opens. Unset, a locked control does nothing. */
  readonly openPlus?: () => void;
  /** Shares this month's page. Unset, there is nothing on it to share yet. */
  readonly sharePage?: () => void;
  /** Puts a monster that is still wild on its wanted poster. Unset, a wild pocket takes no touch. */
  readonly shareWild?: (one: WildOne) => void;
}

const COLUMNS = 3;
/** The board's shelf: 18 points in from the sides, 10 between pockets. */
const SHELF = { side: 18, gap: 10 } as const;
/** How far up from the tab bar the shelf fades into the page. */
const FADE = 120;
/** How much of the row above shows over the card the shelf has gone to. */
const PEEK = 90;
/** The rows that come forward one after another; rows further down come with the last of them. */
const STAGGERED_ROWS = 4;

type Row =
  | { readonly kind: 'card'; readonly monster: CaughtMonster }
  | { readonly kind: 'wild'; readonly one: WildOne };

/**
 * One row's worth of the shelf coming forward. Arriving from the world the pockets start a
 * little large and settle back, row after row, as the island shrinks away behind them: one step
 * back, seen from both sides. From the record they simply rise.
 */
function Forward({ row, children }: { readonly row: number; readonly children: ReactNode }) {
  const { from, to, progress, calm } = useKeepMotion();
  const late = Math.min(STAGGERED_ROWS, Math.max(0, row)) * 0.07;
  const settled = useAnimatedStyle(() => {
    const { v, other } = presence(from.value, to.value, progress.value, CAUGHT);
    if (calm) return { opacity: v, transform: [{ translateY: 0 }, { scale: 1 }] };
    const k = ramp(v, 0.2 + late, 0.72 + late);
    return {
      opacity: k,
      transform: [
        { translateY: mix(other === WORLD ? 26 : 16, 0, k) },
        { scale: mix(other === WORLD ? 1.12 : 0.97, 1, k) },
      ],
    };
  }, [late, calm]);
  return <Animated.View style={settled}>{children}</Animated.View>;
}

/**
 * The binder's shelf, as a tab: every caught card sleeved in its pocket, newest first, in the
 * stock of its rarity, and after them the monsters still wild as outlines. Above the pockets,
 * this month's page and the order of the shelf (the other three orders are Plus; every card is
 * here either way). A tap takes a card out; under the last pocket, the month's page can be shared.
 */
export function ZooPane({
  model,
  actions,
  active = true,
}: {
  readonly model: ZooModel;
  readonly actions: ZooActions;
  /** Whether this is the tab in view. Only then is it found by its name. */
  readonly active?: boolean;
}) {
  const t = useT();
  const { palette, reducedMotion } = useScreenStyle();
  const { width } = useWindowDimensions();
  const { barSpace } = useKeepMotion();
  const { wild, month, language } = model;
  // A new order is dealt: the pockets go, and come back in it row after row.
  const { cards, sort, deal } = useDealtShelf(model.cards, model.sort, reducedMotion);
  const labels = CARD_LABELS[language];
  const pocket = Math.floor((width - SHELF.side * 2 - SHELF.gap * (COLUMNS - 1)) / COLUMNS);

  const rows = useMemo(
    (): Row[] => [
      ...cards.map((monster): Row => ({ kind: 'card', monster })),
      ...wild.map((one): Row => ({ kind: 'wild', one })),
    ],
    [cards, wild],
  );

  // Coming back from a card, the shelf is where that card is: its row sits a little under the
  // top, wherever the browsing ended. A new order moves nothing: the shelf stays where it is.
  const list = useRef<FlatList<Row>>(null);
  const [above, setAbove] = useState<number | null>(null);
  const looked = model.lastLooked;
  const shelved = useRef(rows);
  shelved.current = rows;
  useEffect(() => {
    if (looked === null || above === null) return;
    const at = shelved.current.findIndex((row) => row.kind === 'card' && row.monster.id === looked);
    if (at < 0) return;
    const row = Math.floor(at / COLUMNS) * (SHELF_POCKET.height + SHELF.gap);
    list.current?.scrollToOffset({ offset: Math.max(0, above + row - PEEK), animated: false });
  }, [looked, above]);

  const left = POCKETS - Math.min(POCKETS, month.caught);
  const monthName = labels.months[Number(month.month.slice(5)) - 1] ?? '';
  const note =
    month.caught === 0
      ? t('binder.month.empty')
      : month.complete
        ? t('binder.month.complete')
        : `${t('binder.month.filled', { count: month.caught })} ${t('binder.month.toGo', { count: left })}`;
  // With Plus the month's row opens the pages; without it, it is a locked control.
  const open = model.plus ? actions.openPages : actions.openPlus;
  const header = (
    <View style={styles.above} onLayout={({ nativeEvent }) => setAbove(nativeEvent.layout.height)}>
      <Forward row={-1}>
        <View style={styles.aboveRows}>
          <MonthBanner
            title={t('binder.month.title', { month: monthName })}
            note={note}
            filled={Math.min(POCKETS, month.caught)}
            locked={!model.plus}
            hint={model.plus ? t('binder.month.hint') : t('keep.plusOnly.hint')}
            {...(open ? { onPress: open } : {})}
          />
          <SortChips
            sort={model.sort}
            plus={model.plus}
            onSort={(next) => {
              if (sortNeedsPlus(next) && !model.plus) actions.openPlus?.();
              else actions.sort(next);
            }}
          />
        </View>
      </Forward>
    </View>
  );
  const count =
    wild.length > 0
      ? `${t('binder.caught', { count: cards.length })} · ${t('binder.wild', { count: wild.length })}`
      : t('binder.caught', { count: cards.length });
  return (
    <View style={styles.page} testID={active ? 'zoo' : undefined}>
      <PaneHead tab={CAUGHT} title={t('binder.title')} subtitle={count} countTestID="zoo-count" />
      <FlatList
        ref={list}
        data={rows}
        numColumns={COLUMNS}
        keyExtractor={(row) =>
          row.kind === 'card' ? row.monster.id : `wild-${row.one.monster.id}`
        }
        ListHeaderComponent={header}
        contentContainerStyle={[styles.shelf, { paddingBottom: barSpace + 24 }]}
        columnWrapperStyle={styles.shelfRow}
        showsVerticalScrollIndicator={false}
        // Only the tab in view goes back to its top on a tap on the status bar.
        scrollsToTop={active}
        ListEmptyComponent={
          <SessionText face="body" color={palette.muted} testID="zoo-empty">
            {t('zoo.empty')}
          </SessionText>
        }
        ListFooterComponent={
          actions.sharePage ? (
            <View style={styles.chip}>
              <QuietLink
                label={t('binder.sharePage')}
                hint={t('binder.sharePage.hint')}
                onPress={actions.sharePage}
                testID="binder-share-page"
                icon={<SendIcon color={palette.ink} />}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <Forward row={Math.floor(index / COLUMNS)}>
            {item.kind === 'card' ? (
              <Dealt deal={deal} row={Math.floor(index / COLUMNS)}>
                <PressSpring
                  accessibilityRole="button"
                  accessibilityLabel={`${item.monster.name}, ${labels.rarity[item.monster.rarity]}, ${pocketStat(item.monster, sort, language)}`}
                  accessibilityHint={t('zoo.card.hint')}
                  onPress={() => actions.openCard(item.monster)}
                  testID={`zoo-tile-${index}`}
                >
                  <Pocket
                    rarity={item.monster.rarity}
                    spec={item.monster.spec}
                    name={item.monster.name}
                    width={pocket}
                    size={SHELF_POCKET}
                    number={labels.number(String(item.monster.number).padStart(3, '0'))}
                    rarityWord={
                      item.monster.rarity === 'common' ? null : labels.rarity[item.monster.rarity]
                    }
                    stat={pocketStat(item.monster, sort, language)}
                    chosen={item.monster.id === looked}
                  />
                </PressSpring>
              </Dealt>
            ) : (
              <WildPocket
                spec={item.one.monster.spec}
                width={pocket}
                title={t('binder.stillWild')}
                lurking={t('binder.lurking', { count: item.one.day })}
                label={`${t('binder.stillWild')}. ${t('binder.lurking', { count: item.one.day })}`}
                hint={
                  actions.shareWild ? t('binder.stillWild.share.hint') : t('binder.stillWild.hint')
                }
                testID={`zoo-wild-${index}`}
                {...(actions.shareWild ? { onPress: () => actions.shareWild?.(item.one) } : {})}
              />
            )}
          </Forward>
        )}
      />
      <View pointerEvents="none" style={styles.fade}>
        <EdgeFade color={palette.page} width={width} height={FADE} edge="bottom" solid={0.3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  above: { paddingBottom: 12 },
  aboveRows: { gap: 12 },
  shelf: { paddingHorizontal: SHELF.side, paddingTop: spacing.xs, gap: SHELF.gap },
  shelfRow: { gap: SHELF.gap },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // The way to share the month sits in the middle, under the last pocket.
  chip: { flexDirection: 'row', justifyContent: 'center', paddingTop: spacing.md },
});
