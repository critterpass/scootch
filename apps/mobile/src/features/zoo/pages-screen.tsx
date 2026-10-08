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
import { CloseButton, CornerBar } from '../../ui/corner-bar';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock } from '../reveal/ui/keep-frame';

import type { MonthPage } from './binder';
import { MonthTabs } from './ui/month-tabs';
import { LEAF, LEAF_SPINE, PageLeaf } from './ui/page-leaf';
import { pagePocketFor } from './ui/pocket';
import type { CaughtMonster } from './zoo-cards';

export interface PagesModel {
  /** Every month's page, oldest first. This month's is always among them. */
  readonly pages: readonly MonthPage[];
  /** The month the binder is open on. */
  readonly shown: string;
  /** This month, the page still being filled. */
  readonly current: string;
  readonly language: Language;
}

export interface PagesActions {
  readonly close: () => void;
  readonly show: (month: string) => void;
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

/**
 * The month pages: one leaf of nine pockets for each month, in the binder's own paper with its
 * spine and its three holes. A full month wears a foil stamp that thumps down when its page is
 * shown. The tabs down the edge, a sideways swipe and "Turn the page" all turn to another month,
 * and the leaf swings about its spine as it goes.
 */
export function PagesScreen({ model, actions }: { model: PagesModel; actions: PagesActions }) {
  const t = useT();
  const { palette, reducedMotion, allowFontScaling, size } = useScreenStyle();
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
  useEffect(() => {
    if (asked.current === model.shown) return;
    const older = model.shown < asked.current;
    asked.current = model.shown;
    if (reducedMotion) {
      setDrawn(model.shown);
      return;
    }
    const next = model.shown;
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
  }, [model.shown, reducedMotion, swing]);
  const swung = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(swing.value)),
    transform: [{ perspective: 1400 }, { rotateY: `${swing.value * TURN.degrees}deg` }],
  }));

  const page = pages.find((one) => one.month === drawn) ?? pages[pages.length - 1];
  const at = pages.findIndex((one) => one.month === model.shown);
  const turnBy = (by: number) => {
    if (pages.length < 2) return;
    const next = pages[(at + by + pages.length) % pages.length];
    if (next) actions.show(next.month);
  };
  // A swipe towards the spine turns to the newer page, as a real page turns; away from it, back.
  // The gesture keeps one handler for its whole life, which reads the pages as they are now.
  const turnNow = useRef(turnBy);
  turnNow.current = (by: number) => {
    if (at + by >= 0 && at + by < pages.length) turnBy(by);
  };
  const swiped = useCallback((by: number) => turnNow.current(by), []);
  const swipe = usePanGesture({
    enabled: pages.length > 1,
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
            shown={model.shown}
            current={model.current}
            hint={t('binder.tab.hint')}
            onShow={actions.show}
          />
        </View>
      </View>
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 30) - insets.bottom }]}>
        <Dock
          quiet={{
            label: t('binder.turnPage'),
            hint: t('binder.turnPage.hint'),
            testID: 'binder-turn-page',
            onPress: () => turnBy(1),
          }}
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
});
