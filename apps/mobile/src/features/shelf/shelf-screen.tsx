import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { SHELF, SHELF_KINDS, type ShelfItem, type ShelfKind } from './catalogue';
import { PressSpring } from '../../ui/motion/press-spring';

export interface ShelfModel {
  readonly kind: ShelfKind;
  /** The one item in focus. */
  readonly focus: ShelfItem;
  /** The item the person wears now. */
  readonly wearing: string;
  readonly owned: boolean;
  /** The store's own price text for the focused item; `null` when the store gave none. */
  readonly price: string | null;
  readonly busy: boolean;
  readonly notice: 'failed' | 'unavailable' | null;
}

export interface ShelfActions {
  readonly close: () => void;
  readonly showKind: (kind: ShelfKind) => void;
  readonly focus: (item: ShelfItem) => void;
  readonly buy: () => void;
  readonly wear: () => void;
  readonly takeOff: () => void;
}

const SWATCH = 56;

function Swatch({ item, chosen }: { readonly item: ShelfItem; readonly chosen: boolean }) {
  const { palette } = useScreenStyle();
  const { colours } = item;
  return (
    <View style={[styles.ring, { borderColor: chosen ? palette.ink : 'transparent' }]}>
      <View style={styles.quarters}>
        {[colours.accent, colours.ink, colours.paper, colours.deep].map((colour, index) => (
          <View key={index} style={[styles.quarter, { backgroundColor: colour }]} />
        ))}
      </View>
    </View>
  );
}

/**
 * The shelf: one item in focus at a time, tried on in the preview before anything is bought.
 * Each is a single purchase at the store's own price, and what is shown is what is sold.
 */
export function ShelfScreen({ model, actions }: { model: ShelfModel; actions: ShelfActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { focus } = model;
  const kinds = SHELF_KINDS.filter((kind) => SHELF.some((item) => item.kind === kind));
  const items = SHELF.filter((item) => item.kind === model.kind);
  const worn = model.wearing === focus.id;
  const action = model.owned
    ? worn
      ? undefined
      : {
          label: t('shelf.wear'),
          hint: t('shelf.wear.hint'),
          testID: 'shelf-wear',
          onPress: actions.wear,
        }
    : model.price === null
      ? undefined
      : {
          label: model.busy ? t('plus.purchasing') : t('shelf.buy', { price: model.price }),
          hint: t('shelf.buy.hint'),
          testID: 'shelf-buy',
          ...(model.busy ? {} : { onPress: actions.buy }),
        };
  return (
    <KeepFrame
      testID="shelf"
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="shelf-close"
      footer={
        <Dock
          quiet={{
            label: t('shelf.takeOff'),
            hint: t('shelf.takeOff.hint'),
            testID: 'shelf-take-off',
            onPress: actions.takeOff,
          }}
          {...(action ? { action } : {})}
        />
      }
    >
      <View accessibilityRole="tablist" style={styles.tabs}>
        {kinds.map((kind) => (
          <PressSpring
            key={kind}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === model.kind }}
            accessibilityLabel={t(`shelf.tab.${kind}`)}
            accessibilityHint={t('shelf.tab.hint')}
            onPress={() => actions.showKind(kind)}
            feedback="choice"
            testID={`shelf-tab-${kind}`}
            style={[styles.tab, kind === model.kind ? { backgroundColor: palette.surface } : null]}
          >
            <SessionText face="caption" color={palette.ink}>
              {t(`shelf.tab.${kind}`)}
            </SessionText>
          </PressSpring>
        ))}
      </View>
      <View
        testID="shelf-preview"
        style={[styles.preview, { backgroundColor: focus.colours.paper }]}
      >
        <View style={[styles.pill, { backgroundColor: palette.surface }]}>
          <SessionText face="caption" color={palette.ink}>
            {worn ? t('shelf.wearing') : t('shelf.tryingOn')}
          </SessionText>
        </View>
        <View style={[styles.blob, { backgroundColor: focus.colours.accent }]} />
        <View style={[styles.rule, { backgroundColor: focus.colours.ink }]} />
        <View style={[styles.rule, styles.short, { backgroundColor: focus.colours.deep }]} />
      </View>
      <View style={styles.nameRow}>
        <SessionText face="headline" color={palette.ink} style={styles.grow} testID="shelf-name">
          {t(focus.name)}
        </SessionText>
        {model.owned || model.price === null ? null : (
          <SessionText face="action" color={palette.ink} testID="shelf-price">
            {model.price}
          </SessionText>
        )}
      </View>
      <SessionText face="body" color={palette.muted}>
        {t(focus.about)}
      </SessionText>
      {model.notice ? (
        <SessionText face="body" color={palette.ink} testID={`shelf-notice-${model.notice}`}>
          {t(model.notice === 'failed' ? 'plus.failed' : 'plus.unavailable')}
        </SessionText>
      ) : null}
      <View accessibilityRole="radiogroup" style={styles.swatches}>
        {items.map((item) => (
          <PressSpring
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: item.id === focus.id, checked: item.id === focus.id }}
            accessibilityLabel={t(item.name)}
            accessibilityHint={t('shelf.item.hint')}
            onPress={() => actions.focus(item)}
            feedback="choice"
            testID={`shelf-item-${item.id}`}
          >
            <Swatch item={item} chosen={item.id === focus.id} />
          </PressSpring>
        ))}
      </View>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  tabs: { flexDirection: 'row', alignSelf: 'flex-end', gap: spacing.xs },
  tab: { minHeight: 44, justifyContent: 'center', borderRadius: 22, paddingHorizontal: spacing.md },
  preview: {
    borderRadius: radius.lg + 8,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  pill: { alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  blob: { width: 150, height: 130, borderRadius: 70 },
  rule: { height: 8, width: '70%', borderRadius: 4 },
  short: { width: '45%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  ring: { borderWidth: 3, borderRadius: (SWATCH + 12) / 2, padding: 3 },
  quarters: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quarter: { width: SWATCH / 2, height: SWATCH / 2 },
});
