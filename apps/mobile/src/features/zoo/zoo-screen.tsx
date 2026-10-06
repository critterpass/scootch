import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CARD_LABELS } from '@scootch/art';
import type { CardData, CardFinish } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { Monster } from '../../art/Monster';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { FinishPicker } from '../plus/finish-picker';
import { CardView } from '../reveal/ui/card-view';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { binderOpen, BINDER_SORTS, type BinderSort, type CaughtMonster } from './zoo-cards';

export interface ZooModel {
  /** Every caught monster, in the order to show them. */
  readonly cards: readonly CaughtMonster[];
  readonly language: Language;
  readonly plus: boolean;
  readonly sort: BinderSort | null;
  /** The card opened at full size, with whether sharing it is offered. */
  readonly open: { readonly card: CardData; readonly shareOffered: boolean } | null;
}

export interface ZooActions {
  readonly close: () => void;
  readonly openCard: (monster: CaughtMonster) => void;
  readonly closeCard: () => void;
  readonly nextSort: () => void;
  readonly shareCard: () => void;
  /** A locked control was tapped: the Plus sheet opens. Unset, a locked control does nothing. */
  readonly openPlus?: () => void;
  /** Prints the open card in another finish. Unset, the finishes are not offered. */
  readonly setFinish?: (finish: CardFinish) => void;
}

const COLUMNS = 3;

/** The sort after this one, round through newest first and the binder's four. */
export function sortAfter(sort: BinderSort | null): BinderSort | null {
  if (sort === null) return BINDER_SORTS[0];
  return BINDER_SORTS[BINDER_SORTS.indexOf(sort) + 1] ?? null;
}

/** One card at full size: the card itself carries its stats, and reads them out as one element. */
function OpenCard({ model, actions }: { model: ZooModel; actions: ZooActions }) {
  const t = useT();
  const { width } = useWindowDimensions();
  if (!model.open) return null;
  return (
    <KeepFrame
      testID="zoo-card"
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.closeCard }}
      closeTestID="zoo-card-close"
      {...(model.open.shareOffered
        ? {
            footer: (
              <Dock
                action={{
                  label: t('zoo.shareCard'),
                  hint: t('zoo.shareCard.hint'),
                  testID: 'zoo-share-card',
                  onPress: actions.shareCard,
                }}
              />
            ),
          }
        : {})}
    >
      <View style={styles.centre}>
        <CardView
          card={model.open.card}
          language={model.language}
          width={Math.min(366, width - spacing.md * 2)}
          testID="zoo-card-face"
        />
      </View>
      {actions.setFinish ? (
        <FinishPicker
          worn={model.open.card.finish}
          plus={model.plus}
          onChoose={actions.setFinish}
          onLocked={actions.openPlus ?? (() => undefined)}
        />
      ) : null}
    </KeepFrame>
  );
}

/**
 * The zoo: every caught monster, always, newest first. The binder's sorting is Plus; without it
 * the control is drawn locked and every card is still here.
 */
export function ZooScreen({ model, actions }: { model: ZooModel; actions: ZooActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { width } = useWindowDimensions();
  if (model.open) return <OpenCard model={model} actions={actions} />;

  const labels = CARD_LABELS[model.language];
  const tile = (width - spacing.lg * 2 - spacing.sm * (COLUMNS - 1)) / COLUMNS;
  const open = binderOpen(model.plus);
  const sortLabel = model.sort === null ? t('zoo.sort.newest') : t(`zoo.sort.${model.sort}`);
  return (
    <KeepFrame
      testID="zoo"
      title={t('zoo.title')}
      subtitle={t('zoo.count', { count: model.cards.length })}
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="zoo-close"
      scroll={false}
      footer={
        <Dock
          quiet={
            open
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
                }
          }
        />
      }
    >
      <FlatList
        data={model.cards}
        numColumns={COLUMNS}
        keyExtractor={(monster) => monster.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <SessionText face="body" color={palette.muted} testID="zoo-empty">
            {t('zoo.empty')}
          </SessionText>
        }
        renderItem={({ item: monster, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${monster.name}, ${labels.rarity[monster.rarity]}`}
            accessibilityHint={t('zoo.card.hint')}
            testID={`zoo-tile-${index}`}
            onPress={() => actions.openCard(monster)}
            style={{ width: tile }}
          >
            <View
              style={[styles.tile, { borderColor: palette.ink, backgroundColor: palette.surface }]}
            >
              <Monster spec={monster.spec} size={tile - 14} />
              {monster.rarity === 'rare' ? (
                <View style={[styles.rare, { backgroundColor: palette.tomato }]}>
                  <SessionText face="eyebrow" color={palette.onTomato}>
                    {labels.rarity.rare}
                  </SessionText>
                </View>
              ) : null}
            </View>
            <SessionText face="caption" color={palette.ink} numberOfLines={2}>
              {monster.name}
            </SessionText>
            <SessionText face="caption" color={palette.muted}>
              {`${labels.number(String(monster.number).padStart(3, '0'))} · ${labels.duration(
                Math.floor(monster.catchMinutes / 60),
                monster.catchMinutes % 60,
              )}`}
            </SessionText>
          </Pressable>
        )}
      />
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  grid: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  gridRow: { gap: spacing.sm },
  tile: {
    borderWidth: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'flex-end',
    aspectRatio: 0.76,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  rare: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
