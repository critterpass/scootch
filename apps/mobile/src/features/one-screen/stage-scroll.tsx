import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { spacing } from '@scootch/tokens';

import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useFeel } from '../../ui/motion/use-feel';
import { PullHint } from '../drawer/pull-hint';

/** How far the screen must be pulled down before it counts as meant. */
const PULL_POINTS = 90;
/** The nudge: how far the screen dips by itself, and how long it goes down, holds and comes back. */
const NUDGE = { dips: 58, downMs: 620, holdsMs: 760, backMs: 520 } as const;
// Whether anything moves is decided once, by `useFeel`; the animation does not ask the system.
const ALWAYS = ReduceMotion.Never;
/** The keyboard takes about this long to finish rising; a field is brought into view after it. */
const AFTER_KEYBOARD_MS = 400;
/** The clear space kept between a field brought into view and the dock. */
const CLEAR = 12;

type Measured = { getBoundingClientRect: () => { readonly bottom: number } };
type BringIntoView = (element: Measured | null) => void;

const BringIntoViewContext = createContext<BringIntoView>(() => undefined);

/** For a field inside the one screen: call with its element as it takes the keyboard. */
export function useBringIntoView(): BringIntoView {
  return useContext(BringIntoViewContext);
}

export interface StageScrollProps {
  /** The person pulled the screen down on purpose: the drawer's own gesture. */
  readonly onPull?: (() => void) | undefined;
  /**
   * True for the moment the screen shows its own pull: it dips as if a finger had drawn it down,
   * the drawer's front comes out above it, and it settles back.
   */
  readonly nudge?: boolean | undefined;
  readonly children: ReactNode;
}

/**
 * What the one screen shows between the corners and the dock. It scrolls when there is more than
 * fits, answers the pull that opens the drawer (showing the drawer coming out as it is pulled), and
 * brings a field that takes the keyboard up
 * above the dock once the keyboard has risen.
 */
export function StageScroll({ onPull, nudge = false, children }: StageScrollProps) {
  const { mayMove } = useFeel();
  const frame = useRef<ComponentRef<typeof View>>(null);
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  /** How far the screen is pulled down past its top. */
  const pull = useSharedValue(0);
  const latestPull = useRef(onPull);
  latestPull.current = onPull;
  const pulled = useCallback(() => latestPull.current?.(), []);
  const follow = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.value = event.contentOffset.y;
      pull.value = Math.max(0, -event.contentOffset.y);
    },
    onEndDrag: (event) => {
      if (event.contentOffset.y <= -PULL_POINTS) scheduleOnRN(pulled);
    },
  });
  // The screen's own dip, which the hint reads as a pull. A finger on the screen takes over: the
  // real pull is then the larger of the two.
  const dipped = useSharedValue(0);
  useEffect(() => {
    if (!nudge || !mayMove) return;
    dipped.value = withSequence(
      withTiming(NUDGE.dips, {
        duration: NUDGE.downMs,
        easing: SPRING_CURVE,
        reduceMotion: ALWAYS,
      }),
      withDelay(
        NUDGE.holdsMs,
        withTiming(0, { duration: NUDGE.backMs, easing: SPRING_CURVE, reduceMotion: ALWAYS }),
      ),
    );
  }, [nudge, mayMove, dipped]);
  const shownPull = useDerivedValue(() => Math.max(pull.value, dipped.value));
  const dipping = useAnimatedStyle(() => ({
    transform: [{ translateY: pull.value > 0 ? 0 : dipped.value }],
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const bring = useCallback<BringIntoView>(
    (element) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const seen = frame.current?.getBoundingClientRect();
        if (!element || !seen) return;
        const under = element.getBoundingClientRect().bottom + CLEAR - seen.bottom;
        if (under > 0) scroll.current?.scrollTo({ y: offset.value + under, animated: true });
      }, AFTER_KEYBOARD_MS);
      // The refs are stable for the life of the screen.
    },
    [scroll, offset],
  );

  return (
    <View ref={frame} style={styles.frame}>
      {onPull ? <PullHint pull={shownPull} opensAt={PULL_POINTS} /> : null}
      <Animated.ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={follow}
      >
        <BringIntoViewContext.Provider value={bring}>
          <Animated.View style={[styles.dip, dipping]}>{children}</Animated.View>
        </BringIntoViewContext.Provider>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
  dip: { flexGrow: 1 },
});
