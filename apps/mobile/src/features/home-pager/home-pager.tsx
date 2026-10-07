import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SettingsContainer } from '../settings/settings-container';
import { WorldContainer } from '../world/world-container';

import {
  HOME_PAGES,
  HomePagerContext,
  PageShownContext,
  type HomePage,
  type HomePagerHandle,
} from './home-pager-context';

const HOME = HOME_PAGES.indexOf('home');
/** A page slid to from a button: the boards' curve, fast out and a long soft landing. */
const SLIDE_MS = 520;
/** A page on its way out sinks back a little and fades into the paper. */
const AWAY = { scale: 0.94, fade: 0.55 } as const;
/** The pages beside home are made ready once home has had the phone to itself for a moment. */
const READY_AFTER_MS = 400;
// Whether anything moves is decided once, by `useFeel`; the animation does not ask the system again.
const ALWAYS = ReduceMotion.Never;

interface PageProps {
  readonly at: number;
  readonly width: number;
  readonly offset: SharedValue<number>;
  readonly current: boolean;
  readonly shown: boolean;
  readonly depth: boolean;
  readonly paper: string;
  readonly children: ReactNode;
}

/** One page, as wide as the screen. Only the page being looked at is read out. */
function Page({ at, width, offset, current, shown, depth, paper, children }: PageProps) {
  const sunk = useAnimatedStyle(() => {
    const away = depth ? Math.min(1, Math.abs(offset.value / width - at)) : 0;
    return { transform: [{ scale: 1 - away * (1 - AWAY.scale) }] };
  }, [depth, width, at]);
  // The fade is a sheet of paper over the page, never the page's own opacity: glass under a
  // see-through parent stops being glass.
  const faded = useAnimatedStyle(() => {
    const away = depth ? Math.min(1, Math.abs(offset.value / width - at)) : 0;
    return { opacity: away * AWAY.fade };
  }, [depth, width, at]);
  return (
    <Animated.View
      style={[{ width }, sunk]}
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
    >
      <PageShownContext.Provider value={shown}>{children}</PageShownContext.Provider>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: paper }, faded]}
      />
    </Animated.View>
  );
}

/**
 * Home with the world on one side and Settings on the other: three pages swiped between, the world
 * to the left where its button is and Settings to the right where the more button is. The buttons,
 * the "Your world" row and each page's close control slide the same pages, so there is one way the
 * three move. A swipe is felt as it passes half way; a button is felt as it is pressed.
 */
export function HomePager({ children }: { readonly children: ReactNode }) {
  const { width } = useWindowDimensions();
  const { palette } = useScreenStyle();
  const { mayMove, haptics } = useFeel();
  const focused = useIsFocused();
  const pages = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(HOME * width);
  /** Where a slide started from a button has got to, and whether one is running. */
  const slide = useSharedValue(HOME * width);
  const sliding = useSharedValue(false);
  const nearest = useSharedValue(HOME);
  const [current, setCurrent] = useState(HOME);
  /** The page beside home that is partly on the screen, if either is. */
  const beside = useSharedValue(HOME);
  const [shownBeside, setShownBeside] = useState(HOME);
  const [ready, setReady] = useState(false);
  const [holds, setHolds] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), READY_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const passed = useCallback(
    (page: number, byHand: boolean) => {
      setCurrent(page);
      if (byHand && haptics) touchHaptic('choice');
    },
    [haptics],
  );
  const follow = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        const x = event.contentOffset.x;
        offset.value = x;
        const page = Math.min(HOME_PAGES.length - 1, Math.max(0, Math.round(x / width)));
        if (page !== nearest.value) {
          nearest.value = page;
          scheduleOnRN(passed, page, !sliding.value);
        }
        const side = x < HOME * width - 1 ? HOME - 1 : x > HOME * width + 1 ? HOME + 1 : HOME;
        if (side !== beside.value) {
          beside.value = side;
          scheduleOnRN(setShownBeside, side);
        }
      },
      // A finger on the pages takes them over from a slide that is still landing.
      onBeginDrag: () => {
        cancelAnimation(slide);
        sliding.value = false;
      },
    },
    [width, passed],
  );
  useAnimatedReaction(
    () => slide.value,
    (x) => {
      if (sliding.value) scrollTo(pages, x, 0, false);
    },
  );

  const show = useCallback(
    (page: HomePage) => {
      const at = HOME_PAGES.indexOf(page);
      const x = at * width;
      setReady(true);
      if (haptics) touchHaptic('primary');
      if (!mayMove) {
        // Nothing may move: the page is simply there, and is not felt a second time as a swipe.
        nearest.value = at;
        setCurrent(at);
        pages.current?.scrollTo({ x, animated: false });
        return;
      }
      slide.value = offset.value;
      sliding.value = true;
      slide.value = withTiming(
        x,
        { duration: SLIDE_MS, easing: SPRING_CURVE, reduceMotion: ALWAYS },
        (finished) => {
          if (finished) sliding.value = false;
        },
      );
      // The refs and shared values are stable for the life of the pager.
    },
    [width, haptics, mayMove, pages, slide, sliding, offset, nearest],
  );
  const hold = useCallback(() => {
    setHolds((count) => count + 1);
    return () => setHolds((count) => count - 1);
  }, []);
  const handle = useMemo<HomePagerHandle>(() => ({ show, hold }), [show, hold]);

  // The pages keep their place when the screen changes width.
  useEffect(() => {
    pages.current?.scrollTo({ x: nearest.value * width, animated: false });
  }, [width, pages, nearest]);

  // The system's back, where there is one, goes home from a page beside it before it leaves the app.
  useEffect(() => {
    if (!focused || current === HOME) return undefined;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      show('home');
      return true;
    });
    return () => back.remove();
  }, [focused, current, show]);

  const page = (at: number, content: ReactNode) => (
    <Page
      at={at}
      width={width}
      offset={offset}
      current={current === at}
      shown={at === HOME || shownBeside === at}
      depth={mayMove}
      paper={palette.page}
    >
      {content}
    </Page>
  );
  const kept = ready || shownBeside !== HOME;
  const blank = <View style={styles.fill} />;
  return (
    <HomePagerContext.Provider value={handle}>
      <Animated.ScrollView
        ref={pages}
        horizontal
        pagingEnabled
        scrollEnabled={holds === 0}
        contentOffset={{ x: HOME * width, y: 0 }}
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        overScrollMode="never"
        // A tap on the status bar is the lists', and a tap with the keyboard up is the control's.
        scrollsToTop={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={follow}
        style={styles.fill}
      >
        {page(HOME - 1, kept ? <WorldContainer /> : blank)}
        {page(HOME, children)}
        {page(HOME + 1, kept ? <SettingsContainer /> : blank)}
      </Animated.ScrollView>
    </HomePagerContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
