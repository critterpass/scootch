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
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { spacing } from '@scootch/tokens';

import { PullHint } from '../drawer/pull-hint';

/** How far the screen must be pulled down before it counts as meant. */
const PULL_POINTS = 90;
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
  readonly children: ReactNode;
}

/**
 * What the one screen shows between the corners and the dock. It scrolls when there is more than
 * fits, answers the pull that opens the drawer (showing the drawer coming out as it is pulled), and
 * brings a field that takes the keyboard up
 * above the dock once the keyboard has risen.
 */
export function StageScroll({ onPull, children }: StageScrollProps) {
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
      {onPull ? <PullHint pull={pull} opensAt={PULL_POINTS} /> : null}
      <Animated.ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={follow}
      >
        <BringIntoViewContext.Provider value={bring}>{children}</BringIntoViewContext.Provider>
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
});
