import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { CARD_LABELS } from '@scootch/art';
import type { CardData, CardFinish, IsoDate } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { useT } from '../../i18n/i18n-provider';
import { useMayMove } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock, KeepFrame, type DockAction } from '../reveal/ui/keep-frame';
import { useAppActive } from '../reveal/ui/use-app-active';
import { SessionText } from '../session/ui/session-text';

import { MonsterDetail } from './monster-detail';
import { Segmented } from './ui/segmented';
import { ZooTile } from './ui/zoo-tile';
import {
  binderOpen,
  BINDER_SORTS,
  filterCards,
  rareCount,
  ZOO_FILTERS,
  type BinderSort,
  type CaughtMonster,
  type ZooFilter,
} from './zoo-cards';

export interface ZooModel {
  /** Every caught monster, in the order to show them. */
  readonly cards: readonly CaughtMonster[];
  readonly language: Language;
  readonly plus: boolean;
  readonly sort: BinderSort | null;
  /** The phone's day, for "This week". Left out, the week of the newest catch is used. */
  readonly today?: IsoDate;
  /** The card opened at full size, with whether sharing it is offered. */
  readonly open: { readonly card: CardData; readonly shareOffered: boolean } | null;
}

export interface ZooActions {
  readonly close: () => void;
  readonly openCard: (monster: CaughtMonster) => void;
  readonly closeCard: () => void;
  readonly nextSort: () => void;
  readonly shareCard: () => void;
  /** Shares the card picked from the grid. Unset, "Share a card" is not offered there. */
  readonly shareMonster?: (monster: CaughtMonster) => void;
  /** A locked control was tapped: the Plus sheet opens. Unset, a locked control does nothing. */
  readonly openPlus?: () => void;
  /** Prints the open card in another finish. Unset, the finishes are not offered. */
  readonly setFinish?: (finish: CardFinish) => void;
}

const COLUMNS = 3;
/** The board's grid: 20 points in from the sides, 10 between columns, 12 between rows. */
const GRID = { side: 20, column: 10, row: 12, top: 16 } as const;

/** The sort after this one, round through newest first and the binder's four. */
export function sortAfter(sort: BinderSort | null): BinderSort | null {
  if (sort === null) return BINDER_SORTS[0];
  return BINDER_SORTS[BINDER_SORTS.indexOf(sort) + 1] ?? null;
}

const FILTER_KEY = {
  all: 'zoo.filter.all',
  rare: 'zoo.filter.rare',
  thisWeek: 'zoo.filter.thisWeek',
} as const;

/**
 * The zoo: every caught monster as a mini card, newest first, under the board's three-way control
 * (all, rare, this week). The dock sorts (the binder's sorting is Plus; without it the control is
 * drawn locked and every card is still here) and shares a card: "Share a card" asks which, and the
 * next card tapped goes to the share panel.
 */
export function ZooScreen({ model, actions }: { model: ZooModel; actions: ZooActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { width } = useWindowDimensions();
  const mayMove = useMayMove();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [filter, setFilter] = useState<ZooFilter>('all');
  const [picking, setPicking] = useState(false);

  const today =
    model.today ??
    model.cards.reduce<IsoDate | null>(
      (newest, card) => (newest === null || card.caughtOn > newest ? card.caughtOn : newest),
      null,
    );
  const shown = useMemo(
    () => (today ? filterCards(model.cards, filter, today) : [...model.cards]),
    [model.cards, filter, today],
  );
  const rare = rareCount(model.cards);
  const shimmering =
    mayMove && focused && appActive && !model.open && shown.some((card) => card.rarity === 'rare');
  // One clock for every rare tile's shimmer, on the UI thread, and only while one is on screen
  // and the app is in front.
  const clock = useSharedValue(0);
  const ticking = useFrameCallback((frame) => {
    'worklet';
    clock.value = frame.timeSinceFirstFrame / 1000;
  }, false);
  useEffect(() => {
    ticking.setActive(shimmering);
  }, [ticking, shimmering]);

  if (model.open) {
    return (
      <MonsterDetail
        model={{ ...model.open, language: model.language, plus: model.plus }}
        actions={{
          close: actions.closeCard,
          share: actions.shareCard,
          ...(actions.openPlus ? { openPlus: actions.openPlus } : {}),
          ...(actions.setFinish ? { setFinish: actions.setFinish } : {}),
        }}
      />
    );
  }

  const labels = CARD_LABELS[model.language];
  const tile = (width - GRID.side * 2 - GRID.column * (COLUMNS - 1)) / COLUMNS;
  const sortLabel = model.sort === null ? t('zoo.sort.newest') : t(`zoo.sort.${model.sort}`);
  const count = t('zoo.count', { count: model.cards.length });
  const { shareMonster } = actions;
  const press = (monster: CaughtMonster) => {
    if (picking && shareMonster) {
      setPicking(false);
      shareMonster(monster);
    } else {
      actions.openCard(monster);
    }
  };
  const quiet: DockAction = picking
    ? {
        label: t('zoo.pick.cancel'),
        hint: t('zoo.pick.cancel.hint'),
        testID: 'zoo-share-cancel',
        onPress: () => setPicking(false),
      }
    : binderOpen(model.plus)
      ? {
          label: `${t('zoo.sort')} · ${sortLabel}`,
          hint: t('zoo.sort.hint'),
          testID: 'zoo-sort',
          onPress: actions.nextSort,
        }
      : {
          label: t('zoo.openBinder'),
          hint: t('keep.plusOnly.hint'),
          testID: 'zoo-open-binder',
          locked: true,
          ...(actions.openPlus ? { onPress: actions.openPlus } : {}),
        };
  return (
    <KeepFrame
      testID="zoo"
      title={t('zoo.title')}
      subtitle={
        picking
          ? t('zoo.pick')
          : rare > 0
            ? `${count} · ${t('zoo.count.rare', { count: rare })}`
            : count
      }
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="zoo-close"
      scroll={false}
      footer={
        <Dock
          quiet={quiet}
          {...(shareMonster && model.cards.length > 0 && !picking
            ? {
                action: {
                  label: t('zoo.shareCard'),
                  hint: t('zoo.shareCard.pick.hint'),
                  testID: 'zoo-share-pick',
                  onPress: () => setPicking(true),
                },
              }
            : {})}
        />
      }
    >
      {model.cards.length > 0 ? (
        <View style={styles.filter}>
          <Segmented
            label={t('zoo.filter')}
            chosen={filter}
            onChoose={setFilter}
            segments={ZOO_FILTERS.map((value) => ({
              value,
              label: t(FILTER_KEY[value]),
              testID: `zoo-filter-${value}`,
            }))}
          />
        </View>
      ) : null}
      <FlatList
        data={shown}
        numColumns={COLUMNS}
        keyExtractor={(monster) => monster.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <SessionText face="body" color={palette.muted} testID="zoo-empty">
            {model.cards.length === 0 ? t('zoo.empty') : t(`zoo.empty.${filter}`)}
          </SessionText>
        }
        renderItem={({ item: monster, index }) => (
          <ZooTile
            monster={monster}
            index={index}
            width={tile}
            rareLabel={labels.rarity.rare}
            meta={`${labels.number(String(monster.number).padStart(3, '0'))} · ${labels.duration(
              Math.floor(monster.catchMinutes / 60),
              monster.catchMinutes % 60,
            )}`}
            label={`${monster.name}, ${labels.rarity[monster.rarity]}`}
            hint={picking ? t('zoo.card.pick.hint') : t('zoo.card.hint')}
            clock={clock}
            onPress={press}
          />
        )}
      />
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  filter: { paddingHorizontal: GRID.side, paddingTop: GRID.top },
  grid: {
    paddingHorizontal: GRID.side,
    paddingTop: GRID.top,
    paddingBottom: GRID.top,
    gap: GRID.row,
  },
  gridRow: { gap: GRID.column },
});
