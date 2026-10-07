import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CARD_MATERIALS, rgba } from '@scootch/art';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { BurstMarks } from '../session/ui/burst-marks';
import { sessionInks } from '../session/ui/session-inks';
import { SessionText } from '../session/ui/session-text';

import { itemsOf, STUDIO_KINDS, type StudioItem, type StudioKind } from './catalogue';
import { partOf, type Look } from './look';
import { StudioCard } from './ui/studio-card';
import { Swatch, SWATCH } from './ui/swatch';

export interface StudioModel {
  readonly tab: StudioKind;
  /** What is on the card in the preview. Nothing is worn until it is put on. */
  readonly trying: Look;
  /** The one item in focus: the part of `trying` the tab shows. */
  readonly focus: StudioItem;
  /** What the action under it does. */
  readonly action: 'wearing' | 'wear' | 'buy';
  /** The store's own price text for the focused item; `null` when the store gave none. */
  readonly price: string | null;
  /** Why no price shows on an item that may already be worn; `null` when a price does. */
  readonly held: 'owned' | 'plus' | null;
  /** The member's number, printed on the card; `null` leaves it off. */
  readonly number: number | null;
  readonly busy: boolean;
  readonly notice: 'failed' | 'unavailable' | null;
}

export interface StudioActions {
  readonly close: () => void;
  readonly showTab: (tab: StudioKind) => void;
  readonly tryOn: (item: StudioItem) => void;
  readonly buy: () => void;
  readonly wear: () => void;
  readonly takeOff: () => void;
}

/** The board's stage around the card is 372 points tall. */
const STAGE_HEIGHT = 372;
const STAGE = '#EDE8E0';
const STAGE_DARK = '#27231F';

/**
 * The studio: one card in focus, wearing an ink, a finish and a trail. Everything is tried on
 * live before anything is bought, each change pops the card and replays the trail, and each
 * item is a single purchase at the store's own price. What is shown is what is sold.
 */
export function StudioScreen({ model, actions }: { model: StudioModel; actions: StudioActions }) {
  const t = useT();
  const { palette, reducedMotion, largeText } = useScreenStyle();
  const appearance = useAppearance();
  const { trying, focus } = model;
  const material = CARD_MATERIALS[trying.finish];
  const inks = useMemo(() => sessionInks(appearance, trying.ink), [appearance, trying.ink]);

  // Every change pops the card: down to nine tenths, a little past full size, and back.
  const pop = useSharedValue(1);
  const changed = `${trying.ink}:${trying.finish}:${trying.trail}`;
  useEffect(() => {
    if (reducedMotion) return;
    pop.value = withSequence(
      withTiming(0.9, { duration: 0 }),
      withTiming(1.06, { duration: 250, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
    );
  }, [changed, reducedMotion, pop]);
  const popped = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const action =
    model.action === 'wearing'
      ? { label: t('studio.wearing'), hint: t('studio.wear.hint'), testID: 'studio-wearing' }
      : model.action === 'wear'
        ? {
            label: t('studio.wear'),
            hint: t('studio.wear.hint'),
            testID: 'studio-wear',
            onPress: actions.wear,
          }
        : model.price === null
          ? undefined
          : {
              label: model.busy ? t('plus.purchasing') : t('studio.buy', { price: model.price }),
              hint: t('studio.buy.hint'),
              testID: 'studio-buy',
              ...(model.busy ? {} : { onPress: actions.buy }),
            };
  const aside =
    model.held === 'owned'
      ? t('studio.owned')
      : model.held === 'plus'
        ? t('studio.withPlus')
        : model.price;
  return (
    <KeepFrame
      testID="studio"
      title={t('studio.title')}
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="studio-close"
      footer={
        <Dock
          quiet={{
            label: t('studio.takeOff'),
            hint: t('studio.takeOff.hint'),
            testID: 'studio-take-off',
            onPress: actions.takeOff,
          }}
          {...(action ? { action } : {})}
        />
      }
    >
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: palette.surface }]}>
        {STUDIO_KINDS.map((kind) => {
          const shown = kind === model.tab;
          return (
            <PressSpring
              key={kind}
              accessibilityRole="tab"
              accessibilityState={{ selected: shown }}
              accessibilityLabel={t(`studio.tab.${kind}`)}
              accessibilityHint={t('studio.tab.hint')}
              onPress={() => actions.showTab(kind)}
              feedback="choice"
              testID={`studio-tab-${kind}`}
              style={[styles.tab, shown ? { backgroundColor: `${palette.ink}14` } : null]}
            >
              <SessionText face="caption" color={palette.ink}>
                {t(`studio.tab.${kind}`)}
              </SessionText>
            </PressSpring>
          );
        })}
      </View>

      <View
        testID="studio-preview"
        style={[
          styles.stage,
          {
            height: largeText ? STAGE_HEIGHT * 0.8 : STAGE_HEIGHT,
            backgroundColor: appearance === 'dark' ? STAGE_DARK : STAGE,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            { boxShadow: `0 0 90px 60px ${rgba(material.glow[0], material.glow[1])}` },
          ]}
        />
        <BurstMarks
          key={changed}
          kind="confetti"
          inks={inks}
          reducedMotion={reducedMotion}
          trail={trying.trail}
        />
        <Animated.View style={popped}>
          <StudioCard look={trying} number={model.number} />
        </Animated.View>
        <View style={[styles.pill, styles.leading, { backgroundColor: 'rgba(255,255,255,0.85)' }]}>
          <SessionText face="caption" color="#1C1A17" testID="studio-state">
            {model.action === 'wearing' ? t('studio.wearing') : t('studio.tryingOn')}
          </SessionText>
        </View>
        <View style={[styles.pill, styles.trailing, { backgroundColor: '#1C1A17' }]}>
          <SessionText face="caption" color="#FFFFFF" testID="studio-trail">
            {t(`studio.trail.${trying.trail}`).toLocaleUpperCase()}
          </SessionText>
        </View>
      </View>

      <View style={styles.nameRow}>
        <SessionText face="headline" color={palette.ink} style={styles.grow} testID="studio-name">
          {t(focus.name)}
        </SessionText>
        {aside === null ? null : (
          <SessionText face="action" color={palette.ink} testID="studio-price">
            {aside}
          </SessionText>
        )}
      </View>
      <SessionText face="body" color={palette.muted}>
        {t(focus.about)}
      </SessionText>
      {model.notice ? (
        <SessionText
          face="body"
          color={palette.ink}
          accessibilityLiveRegion="polite"
          testID={`studio-notice-${model.notice}`}
        >
          {t(model.notice === 'failed' ? 'plus.failed' : 'plus.unavailable')}
        </SessionText>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        style={styles.strip}
        contentContainerStyle={styles.swatches}
      >
        {itemsOf(model.tab).map((item) => {
          const chosen = item.id === partOf(trying, model.tab);
          return (
            <PressSpring
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t(item.name)}
              accessibilityHint={t('studio.item.hint')}
              onPress={() => actions.tryOn(item)}
              feedback="choice"
              testID={`studio-item-${item.id}`}
              style={styles.item}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    boxShadow: chosen
                      ? `0 0 0 3px ${palette.page}, 0 0 0 5px ${palette.ink}`
                      : '0 4px 10px -4px rgba(28,26,23,0.25)',
                  },
                ]}
              >
                <Swatch item={item} />
              </View>
              <SessionText face="caption" color={chosen ? palette.ink : palette.muted}>
                {t(item.short)}
              </SessionText>
            </PressSpring>
          );
        })}
      </ScrollView>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 22,
    padding: 4,
    gap: 2,
  },
  tab: { minHeight: 36, justifyContent: 'center', borderRadius: 18, paddingHorizontal: 14 },
  stage: { borderRadius: 34, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  pill: {
    position: 'absolute',
    top: 16,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  leading: { left: 16 },
  trailing: { right: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  // The strip runs to the screen's edges, past the frame's own margin.
  strip: { marginHorizontal: -spacing.lg },
  swatches: { paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: 4, gap: 10 },
  item: { alignItems: 'center', gap: 8, minWidth: SWATCH + 6 },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 },
});
