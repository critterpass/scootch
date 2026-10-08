import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, spacing } from '@scootch/tokens';

import type { MonsterProps } from '../../art/Monster';
import { useT } from '../../i18n/i18n-provider';
import { BackButton, CORNER, CornerBar } from '../../ui/corner-bar';
import { CROSSFADE_MS } from '../../ui/motion/motion-tokens';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { PlusBadge } from '../plus/ui/plus-badge';
import { SessionText } from '../session/ui/session-text';

import { itemsOf, type StudioItem, type StudioKind } from './catalogue';
import { partOf, type Look } from './look';
import { FinishStage } from './ui/finish-stage';
import { InkStage } from './ui/ink-stage';
import { STAGE, useStageSize } from './ui/stage-parts';
import { StudioDock } from './ui/studio-dock';
import { StudioTabs } from './ui/studio-tabs';
import { StudioToast } from './ui/studio-toast';
import { SwatchStrip, type SwatchNote } from './ui/swatch-strip';
import { TrailStage } from './ui/trail-stage';

export interface StudioModel {
  readonly tab: StudioKind;
  /** What the stage shows: what is worn, with whatever is only being tried on. */
  readonly trying: Look;
  /** The one item in focus: the part of `trying` the tab shows. */
  readonly focus: StudioItem;
  /** What the action under it does. */
  readonly action: 'wearing' | 'wear' | 'buy';
  /** The store's own price text for the focused item; `null` when the store gave none. */
  readonly price: string | null;
  /** Why no price shows on an item that may already be worn; `null` when a price does. */
  readonly held: 'owned' | 'plus' | null;
  /** What is written under each swatch of the tab, by the item's id. */
  readonly notes: Readonly<Record<string, SwatchNote>>;
  /** False when "Take it off" would change nothing: the control is then drawn faint. */
  readonly canTakeOff: boolean;
  /** The member's number, printed on the card; `null` leaves it off. */
  readonly number: number | null;
  /** Scootch's line on the one screen the ink is previewed on, from the line pack. */
  readonly homeLine: string;
  /** The person's newest monster, caught again on the trail's stage; `null` before there is one. */
  readonly monster: { readonly spec: MonsterProps['spec']; readonly name: string } | null;
  readonly busy: boolean;
  readonly notice: 'failed' | 'unavailable' | null;
  /**
   * Whether the finish in focus is one Plus would put on, for someone it would dress: the way to
   * Plus then stands at the foot of the stage, where the hint is, so showing it moves nothing.
   */
  readonly plusOffered: boolean;
  /** Said once after a purchase, over the top of the screen; `null` when there is nothing to say. */
  readonly toast: string | null;
}

export interface StudioActions {
  readonly close: () => void;
  readonly showTab: (tab: StudioKind) => void;
  readonly tryOn: (item: StudioItem) => void;
  readonly buy: () => void;
  readonly wear: () => void;
  readonly takeOff: () => void;
  /** Opens the Plus sheet. Unset on a day when nothing is sold. */
  readonly openPlus?: () => void;
}

/** The board's 30 points under a dock, never less than the home bar's own clear space. */
const DOCK_BOTTOM = 30;

/**
 * The stage of the tab in view. A change of tab fades the new stage in; the screen's own arrival
 * is the stack's, so nothing fades the first time.
 */
function Stage({ model, plus }: { readonly model: StudioModel; readonly plus: ReactNode }) {
  const { reducedMotion } = useScreenStyle();
  const size = useStageSize();
  const { tab, trying } = model;
  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        key={tab}
        style={styles.stage}
        {...(reducedMotion
          ? {}
          : { entering: FadeIn.duration(CROSSFADE_MS).reduceMotion(ReduceMotion.Never) })}
      >
        {tab === 'finish' ? (
          <FinishStage
            look={trying}
            number={model.number}
            wearing={model.action === 'wearing'}
            size={size}
            foot={plus}
          />
        ) : tab === 'ink' ? (
          <InkStage ink={trying.ink} line={model.homeLine} size={size} />
        ) : (
          <TrailStage trail={trying.trail} ink={trying.ink} monster={model.monster} size={size} />
        )}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

/**
 * The studio: three tabs, three things to wear, each shown on the thing it changes. A finish is
 * on a card under a light, an ink is on the one screen, a trail is on a catch. Everything is worn
 * live before anything is bought, each item is a single purchase at the store's own price, and
 * what is shown is what is sold.
 */
export function StudioScreen({ model, actions }: { model: StudioModel; actions: StudioActions }) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const { focus, tab } = model;
  const aside =
    model.held === 'owned'
      ? t('studio.owned')
      : model.held === 'plus'
        ? t('studio.withPlus')
        : model.price;
  return (
    <SafeFrame testID="studio" style={[styles.page, { backgroundColor: palette.page }]}>
      <CornerBar
        // The studio is gone back from, as every page under Settings is: an arrow in the leading
        // corner, and an empty one opposite so the tabs stay in the middle.
        leading={
          <BackButton
            label={t('keep.close')}
            hint={t('keep.close.hint')}
            onPress={actions.close}
            testID="studio-close"
          />
        }
        trailing={<View style={styles.corner} />}
      >
        <View style={styles.tabs}>
          <StudioTabs shown={tab} onShow={actions.showTab} />
        </View>
      </CornerBar>
      <ScrollView
        contentContainerStyle={styles.middle}
        showsVerticalScrollIndicator={false}
        testID="studio-list"
      >
        <Stage
          model={model}
          plus={
            // Plus wears every finish: beside the price of one, the way to all of them.
            model.plusOffered && actions.openPlus ? (
              <QuietLink
                label={t('studio.plusDoor')}
                hint={t('studio.plusDoor.hint')}
                onPress={actions.openPlus}
                testID="studio-plus"
                icon={<PlusBadge />}
              />
            ) : null
          }
        />
        <View style={styles.words}>
          <View style={styles.nameRow}>
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.5}
              accessibilityRole="header"
              style={[styles.name, { color: palette.ink, fontSize: size(25) }]}
              testID="studio-name"
            >
              {t(focus.name)}
            </Text>
            {aside === null ? null : (
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.5}
                style={[
                  styles.aside,
                  { color: model.held ? palette.muted : palette.ink, fontSize: size(18) },
                ]}
                testID="studio-price"
              >
                {aside}
              </Text>
            )}
          </View>
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={2}
            style={[
              styles.about,
              {
                color: palette.muted,
                fontSize: size(15),
                lineHeight: size(15) * 1.4,
                // Two lines' room, so a shorter line under the next swatch moves nothing.
                minHeight: size(15) * 1.4 * 2,
              },
            ]}
          >
            {t(focus.about)}
          </Text>
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
        </View>
        <SwatchStrip
          kind={tab}
          items={itemsOf(tab)}
          chosen={partOf(model.trying, tab)}
          notes={model.notes}
          onPick={actions.tryOn}
        />
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, DOCK_BOTTOM) - insets.bottom },
        ]}
      >
        <StudioDock
          action={model.action}
          price={model.price}
          busy={model.busy}
          canTakeOff={model.canTakeOff}
          onTakeOff={actions.takeOff}
          onWear={actions.wear}
          onBuy={actions.buy}
        />
      </View>
      <StudioToast text={model.toast} />
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  // An empty corner the size of the close control, so the tabs sit in the middle of the screen.
  corner: { width: CORNER.size, height: CORNER.size },
  tabs: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: CORNER.size },
  middle: { flexGrow: 1, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  stage: { marginHorizontal: STAGE.side },
  // The words start 24 points in, as every heading does.
  words: { paddingHorizontal: 24, marginTop: 18, gap: 6 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.heading,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  aside: { fontFamily: fonts.heading, fontWeight: '800' },
  about: { fontFamily: fonts.body },
  footer: { paddingHorizontal: 14, paddingTop: spacing.sm },
});
