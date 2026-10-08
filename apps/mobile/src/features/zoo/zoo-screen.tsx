import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_LABELS, type DrawCommand } from '@scootch/art';
import type { Id } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CloseButton, CornerBar } from '../../ui/corner-bar';
import { PressSpring } from '../../ui/motion/press-spring';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { STAMPED } from '../plus/ui/member-card';
import { CommandCanvas } from '../reveal/ui/command-canvas';
import { Dock, type DockAction } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import {
  POCKETS,
  pocketStat,
  sortNeedsPlus,
  type MonthPage,
  type ShelfSort,
  type WildOne,
} from './binder';
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
  readonly close: () => void;
  readonly openCard: (monster: CaughtMonster) => void;
  readonly sort: (sort: ShelfSort) => void;
  /** Opens the month pages. Set only with Plus. */
  readonly openPages?: () => void;
  /** A locked control was tapped: the Plus sheet opens. Unset, a locked control does nothing. */
  readonly openPlus?: () => void;
  readonly openWorld: () => void;
  /** Shares this month's page. Unset, there is nothing on it to share yet. */
  readonly sharePage?: () => void;
  /** Puts a monster that is still wild on its wanted poster. Unset, a wild pocket takes no touch. */
  readonly shareWild?: (one: WildOne) => void;
}

const COLUMNS = 3;
/** The board's shelf: 18 points in from the sides, 10 between pockets. */
const SHELF = { side: 18, gap: 10 } as const;
/** How far up from the dock the shelf fades into the page. */
const FADE = 120;
/** The dock and the board's 30 points under it, which the last row scrolls clear of. */
const DOCK = { height: 68, bottom: 30 } as const;
/** How much of the row above shows over the card the shelf has gone to. */
const PEEK = 90;

type Row =
  | { readonly kind: 'card'; readonly monster: CaughtMonster }
  | { readonly kind: 'wild'; readonly one: WildOne };

/** The page's own colour, clear at the top and solid at the foot, to fade the shelf out. */
function Fade({ color, width }: { readonly color: string; readonly width: number }) {
  const commands = useMemo(
    (): DrawCommand[] => [
      {
        op: 'paint',
        path: [['M', 0, 0], ['L', width, 0], ['L', width, FADE], ['L', 0, FADE], ['Z']],
        paint: {
          kind: 'linear',
          from: [0, 0],
          to: [0, FADE],
          stops: [
            [0, color, 0],
            [0.7, color, 1],
            [1, color, 1],
          ],
        },
        alpha: 1,
        blend: 'normal',
      },
    ],
    [color, width],
  );
  return <CommandCanvas commands={commands} space={{ width, height: FADE }} width={width} />;
}

/**
 * The binder's shelf: every caught card sleeved in its pocket, newest first, in the stock of its
 * rarity, and after them the monsters still wild as outlines. Above the pockets, this month's
 * page and the order of the shelf (the other three orders are Plus; every card is here either
 * way). A tap takes a card out; the dock opens the world and shares the month's page.
 */
export function ZooScreen({ model, actions }: { model: ZooModel; actions: ZooActions }) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { cards, wild, month, language } = model;
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
  // top, wherever the browsing ended.
  const list = useRef<FlatList<Row>>(null);
  const [above, setAbove] = useState<number | null>(null);
  const looked = model.lastLooked;
  useEffect(() => {
    if (looked === null || above === null) return;
    const at = rows.findIndex((row) => row.kind === 'card' && row.monster.id === looked);
    if (at < 0) return;
    const row = Math.floor(at / COLUMNS) * (SHELF_POCKET.height + SHELF.gap);
    list.current?.scrollToOffset({ offset: Math.max(0, above + row - PEEK), animated: false });
  }, [looked, rows, above]);

  const left = POCKETS - Math.min(POCKETS, month.caught);
  const monthName = labels.months[Number(month.month.slice(5)) - 1] ?? '';
  const note =
    month.caught === 0
      ? t('binder.month.empty')
      : month.complete
        ? t('binder.month.complete')
        : `${t('binder.month.filled', { count: month.caught })} ${t('binder.month.toGo', { count: left })}`;
  const quiet: DockAction = {
    label: t('binder.openWorld'),
    hint: t('binder.openWorld.hint'),
    testID: 'binder-open-world',
    onPress: actions.openWorld,
  };
  // With Plus the month's row opens the pages; without it, it is a locked control.
  const open = model.plus ? actions.openPages : actions.openPlus;
  const header = (
    <View style={styles.above} onLayout={({ nativeEvent }) => setAbove(nativeEvent.layout.height)}>
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
  );
  return (
    <SafeFrame testID="zoo" style={[styles.page, { backgroundColor: palette.page }]}>
      <CornerBar
        trailing={
          <CloseButton
            label={t('keep.close')}
            hint={t('keep.close.hint')}
            onPress={actions.close}
            testID="zoo-close"
          />
        }
      >
        <View style={styles.titles}>
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[styles.title, { color: palette.ink, fontSize: size(34) }]}
          >
            {t('binder.title')}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.6}
            style={[styles.count, { color: palette.muted, fontSize: size(9.5) }]}
            testID="zoo-count"
          >
            {(wild.length > 0
              ? `${t('binder.caught', { count: cards.length })} · ${t('binder.wild', { count: wild.length })}`
              : t('binder.caught', { count: cards.length })
            ).toLocaleUpperCase()}
          </Text>
        </View>
      </CornerBar>
      <FlatList
        ref={list}
        data={rows}
        numColumns={COLUMNS}
        keyExtractor={(row) =>
          row.kind === 'card' ? row.monster.id : `wild-${row.one.monster.id}`
        }
        ListHeaderComponent={header}
        contentContainerStyle={[
          styles.shelf,
          { paddingBottom: DOCK.height + Math.max(insets.bottom, DOCK.bottom) + 24 },
        ]}
        columnWrapperStyle={styles.shelfRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <SessionText face="body" color={palette.muted} testID="zoo-empty">
            {t('zoo.empty')}
          </SessionText>
        }
        renderItem={({ item, index }) =>
          item.kind === 'card' ? (
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={`${item.monster.name}, ${labels.rarity[item.monster.rarity]}, ${pocketStat(item.monster, model.sort, language)}`}
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
                stat={pocketStat(item.monster, model.sort, language)}
                chosen={item.monster.id === looked}
              />
            </PressSpring>
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
          )
        }
      />
      <View pointerEvents="none" style={styles.fade}>
        <Fade color={palette.page} width={width} />
      </View>
      <View style={[styles.dock, { bottom: Math.max(insets.bottom, DOCK.bottom) }]}>
        <Dock
          quiet={quiet}
          {...(actions.sharePage
            ? {
                action: {
                  label: t('binder.sharePage'),
                  hint: t('binder.sharePage.hint'),
                  testID: 'binder-share-page',
                  onPress: actions.sharePage,
                },
              }
            : {})}
        />
      </View>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  titles: { flex: 1, gap: 5, paddingTop: 6, paddingBottom: 12, paddingLeft: 2 },
  title: { fontFamily: fonts.heading, fontWeight: '900', letterSpacing: -1.19 },
  count: { fontFamily: STAMPED, fontWeight: '700', letterSpacing: 1.33 },
  above: { gap: 12, paddingBottom: 12 },
  shelf: { paddingHorizontal: SHELF.side, gap: SHELF.gap },
  shelfRow: { gap: SHELF.gap },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE },
  dock: { position: 'absolute', left: 16, right: 16 },
});
