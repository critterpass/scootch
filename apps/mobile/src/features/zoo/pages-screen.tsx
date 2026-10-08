import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { CARD_LABELS } from '@scootch/art';
import type { Language } from '@scootch/i18n';
import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, GlassDock } from '../../ui/buttons';
import { CloseButton, CornerBar } from '../../ui/corner-bar';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';

import { leafCount, turnLeaf, type LeafAt, type MonthPage } from './binder';
import { LeafPager } from './ui/leaf-pager';
import { MonthTabs } from './ui/month-tabs';
import { LEAF, LEAF_SPINE, PageLeaf } from './ui/page-leaf';
import { pagePocketFor } from './ui/pocket';
import type { CaughtMonster } from './zoo-cards';

export interface PagesModel {
  /** Every month's page, oldest first. This month's is always among them. */
  readonly pages: readonly MonthPage[];
  /** The month the binder is open on, and which of its leaves. */
  readonly shown: LeafAt;
  /** This month, the page still being filled. */
  readonly current: string;
  readonly language: Language;
}

export interface PagesActions {
  readonly close: () => void;
  readonly show: (at: LeafAt) => void;
  readonly openCard: (monster: CaughtMonster) => void;
  /** Shares the page that is open. Unset, the page has nothing on it to share. */
  readonly sharePage?: () => void;
}

/** The board's leaf: 18 points in, the tabs' width kept clear on the far side, 8 between pockets. */
const PAGE = { side: 18, tabs: 26, spine: LEAF_SPINE, gap: 8, columns: 3 } as const;
/** A page turning: the old leaf swings away about its spine, the next one swings in. */
const TURN = { awayMs: 220, inMs: 380, degrees: 62 } as const;
/** A sideways drag this far, or a flick this fast, turns the page. */
const SWIPE = { far: 56, fast: 520, takesAfter: 14, freeEdge: 20 } as const;
/** The bar, the dock, the room round the leaf and the leaf's own head and padding. */
const AROUND_LEAF = 44 + 76 + 28 + 32 + 36;

/** Where a leaf comes in the binder, as words that sort: a month, then its leaves in turn. */
const placeOf = (at: LeafAt) => `${at.month}#${String(at.leaf).padStart(4, '0')}`;

/**
 * The month pages: leaves of nine pockets, in the binder's own paper with its spine and its
 * three holes. A month with more than nine catches runs to more leaves. A full month wears a
 * foil stamp that thumps down when its first leaf is shown. The tabs down the edge open a month;
 * a sideways swipe and the pager's arrows turn leaf by leaf, on through the months, and the leaf
 * swings about its spine as it goes.
 */
export function PagesScreen({ model, actions }: { model: PagesModel; actions: PagesActions }) {
  const t = useT();
  const { palette, reducedMotion, allowFontScaling, size, largeText } = useScreenStyle();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { pages, language } = model;
  const labels = CARD_LABELS[language];
  const nameOf = (month: string) => labels.months[Number(month.slice(5)) - 1] ?? '';

  // The leaf that is drawn follows the month that is asked for, half a turn behind: the old one
  // swings away first, and only then is the next one put in its place.
  const [drawn, setDrawn] = useState(model.shown);
  const swing = useSharedValue(0);
  const asked = useRef(model.shown);
  const place = placeOf(model.shown);
  useEffect(() => {
    if (placeOf(asked.current) === place) return;
    const older = place < placeOf(asked.current);
    const next = model.shown;
    asked.current = next;
    if (reducedMotion) {
      setDrawn(next);
      return;
    }
    const arrive = () => {
      setDrawn(next);
      swing.value = older ? -1 : 1;
      swing.value = withTiming(0, { duration: TURN.inMs, easing: SPRING_CURVE });
    };
    swing.value = withTiming(
      older ? 1 : -1,
      { duration: TURN.awayMs, easing: Easing.in(Easing.quad) },
      (done) => {
        if (done) scheduleOnRN(arrive);
      },
    );
    // The place stands for the leaf asked for: a new object for the same leaf turns nothing.
  }, [place, reducedMotion, swing]);
  const swung = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(swing.value)),
    transform: [{ perspective: 1400 }, { rotateY: `${swing.value * TURN.degrees}deg` }],
  }));

  const page = pages.find((one) => one.month === drawn.month) ?? pages[pages.length - 1];
  const open = pages.find((one) => one.month === model.shown.month);
  const back = turnLeaf(pages, model.shown, -1);
  const on = turnLeaf(pages, model.shown, 1);
  const turnBy = (by: 1 | -1) => {
    const next = by === 1 ? on : back;
    if (next) actions.show(next);
  };
  // A swipe towards the spine turns to the newer leaf, as a real page turns; away from it, back.
  // The gesture keeps one handler for its whole life, which reads the leaves as they are now.
  const turnNow = useRef(turnBy);
  turnNow.current = turnBy;
  const swiped = useCallback((by: 1 | -1) => turnNow.current(by), []);
  const swipe = usePanGesture({
    enabled: back !== null || on !== null,
    // The strip along the leading edge is left to the swipe that goes back.
    hitSlop: { left: -SWIPE.freeEdge },
    activeOffsetX: [-SWIPE.takesAfter, SWIPE.takesAfter],
    failOffsetY: [-SWIPE.takesAfter, SWIPE.takesAfter],
    onDeactivate: (event) => {
      'worklet';
      if (event.canceled) return;
      const far = Math.abs(event.translationX) > SWIPE.far;
      const fast = Math.abs(event.velocityX) > SWIPE.fast;
      if (!far && !fast) return;
      scheduleOnRN(swiped, event.translationX < 0 ? 1 : -1);
    },
  });

  if (!page) return <View style={[styles.page, { backgroundColor: palette.page }]} />;
  const leafWidth = window.width - PAGE.side * 2 - PAGE.tabs;
  const pocket = Math.floor(
    (leafWidth - PAGE.spine - 12 - 14 - PAGE.gap * (PAGE.columns - 1)) / PAGE.columns,
  );
  // Three rows of pockets fit the leaf, whatever the phone: what the bar, the dock and the
  // leaf's own head and margins leave is shared between them.
  const room =
    window.height -
    insets.top -
    Math.max(insets.bottom, 30) -
    AROUND_LEAF -
    PAGE.gap * (PAGE.columns - 1);
  const pocketSize = pagePocketFor(room / PAGE.columns);
  return (
    <SafeFrame testID="binder-pages" style={[styles.page, { backgroundColor: palette.page }]}>
      <CornerBar
        leading={<View style={styles.corner} />}
        trailing={
          <CloseButton
            label={t('keep.close')}
            hint={t('keep.close.hint')}
            onPress={actions.close}
            testID="binder-pages-close"
          />
        }
      >
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.4}
          style={[styles.heading, { color: palette.ink, fontSize: size(17) }]}
        >
          {t('binder.pages')}
        </Text>
      </CornerBar>
      <View style={styles.body}>
        <GestureDetector gesture={swipe}>
          <Animated.View style={[styles.leaf, { width: leafWidth }, swung]} testID="binder-leaf">
            <PageLeaf
              page={page}
              leaf={drawn.leaf}
              monthName={nameOf(page.month)}
              language={language}
              pocketWidth={pocket}
              pocketSize={pocketSize}
              onOpen={actions.openCard}
            />
          </Animated.View>
        </GestureDetector>
        <View style={styles.tabs}>
          <MonthTabs
            tabs={pages.map((one) => ({
              month: one.month,
              short: nameOf(one.month).slice(0, 3),
              name: nameOf(one.month),
            }))}
            shown={model.shown.month}
            current={model.current}
            hint={t('binder.tab.hint')}
            onShow={(month) => actions.show({ month, leaf: 0 })}
          />
        </View>
      </View>
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 30) - insets.bottom }]}>
        <GlassDock style={largeText ? styles.stack : styles.row}>
          {/* With one leaf in the whole binder there is nothing to turn to, and no pager. */}
          {back === null && on === null ? null : (
            <View style={largeText ? null : styles.grow}>
              <LeafPager
                leaf={model.shown.leaf + 1}
                of={open ? leafCount(open) : 1}
                monthName={nameOf(model.shown.month)}
                {...(back ? { onBack: () => turnBy(-1) } : {})}
                {...(on ? { onOn: () => turnBy(1) } : {})}
              />
            </View>
          )}
          {actions.sharePage ? (
            <CapsuleButton
              tone="ink"
              label={t('binder.sharePage')}
              hint={t('binder.sharePage.hint')}
              testID="binder-share-page"
              onPress={actions.sharePage}
              style={largeText ? null : styles.grow}
            />
          ) : null}
        </GlassDock>
      </View>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  // An empty corner the size of the close control, so the title sits in the middle.
  corner: { width: 44, height: 44 },
  heading: {
    flex: 1,
    textAlign: 'center',
    alignSelf: 'center',
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: PAGE.side,
    paddingTop: 14,
    paddingBottom: 14,
  },
  // The leaf turns about its spine, on its leading edge.
  leaf: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: LEAF.paper,
    paddingTop: 18,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: PAGE.spine + 12,
    gap: 10,
    transformOrigin: 'left center',
    boxShadow: '0 24px 40px -20px rgba(28,26,23,0.45)',
  },
  tabs: { width: PAGE.tabs + PAGE.side, paddingTop: 22 },
  dock: { paddingHorizontal: 14, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  stack: { gap: 8 },
  grow: { flex: 1 },
});
