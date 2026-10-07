import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

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
 * fits, answers the pull that opens the drawer, and brings a field that takes the keyboard up
 * above the dock once the keyboard has risen.
 */
export function StageScroll({ onPull, children }: StageScrollProps) {
  const frame = useRef<ComponentRef<typeof View>>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const bring = useCallback<BringIntoView>((element) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const seen = frame.current?.getBoundingClientRect();
      if (!element || !seen) return;
      const under = element.getBoundingClientRect().bottom + CLEAR - seen.bottom;
      if (under > 0) scroll.current?.scrollTo({ y: offset.current + under, animated: true });
    }, AFTER_KEYBOARD_MS);
  }, []);

  return (
    <View ref={frame} style={styles.frame}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        onScrollEndDrag={(event) => {
          if (event.nativeEvent.contentOffset.y <= -PULL_POINTS) onPull?.();
        }}
      >
        <BringIntoViewContext.Provider value={bring}>{children}</BringIntoViewContext.Provider>
      </ScrollView>
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
