import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CSS_EASE, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { PressSpring } from '../../ui/motion/press-spring';
import { useMayMove } from '../../ui/motion/use-feel';

import type { ReceiptStage } from './receipt-model';
import { PAPER_PRESS, paper } from './receipt-parts';

const ALWAYS = ReduceMotion.Never;
/** The board's `.opt`: its paper colour over 240 ms, its ring over 260 ms on the interface curve. */
const COLOUR_MS = 240;
const RING_MS = 260;
/** The board's `.write`: the amount is written on from the left over 620 ms on the interface curve. */
const WRITE_MS = 620;

/** The board's paper edge: a half-circle bite every 18 points along the top. */
const BITE = 10;
const BITE_EVERY = 18;
const BITES = 30;
/** The board's `thud`: the paper sinks 3 points as the stamp lands, 180 ms in, over 380 ms. */
const THUD = { delayMs: 180, ms: 380, depth: 3, downShare: 0.35 } as const;

/** The receipt's torn top edge, bitten out in the page's colour. Decoration. */
export function PaperEdge() {
  return (
    <View style={styles.edge} pointerEvents="none">
      {Array.from({ length: BITES }, (_, i) => (
        <View key={i} style={styles.bite} />
      ))}
    </View>
  );
}

/**
 * The paper's answer to a new stage after the first: it thuds, and he signs it again. Nothing
 * happens when the page opens, or on the offer, where there is nothing to sign for yet.
 */
export function useStageChange(stage: ReceiptStage) {
  const mayMove = useMayMove();
  const opened = useRef(stage);
  const signed = opened.current !== stage && stage !== 'offer';
  const thud = useSharedValue(0);
  useEffect(() => {
    if (!signed || !mayMove) return;
    const curve = { easing: SPRING_CURVE, reduceMotion: ALWAYS };
    thud.value = withDelay(
      THUD.delayMs,
      withSequence(
        withTiming(THUD.depth, { duration: THUD.ms * THUD.downShare, ...curve }),
        withTiming(0, { duration: THUD.ms * (1 - THUD.downShare), ...curve }),
      ),
    );
  }, [stage, signed, mayMove, thud]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: thud.value }] }));
  return { signed, style };
}

/** One way to pay on the receipt: picked, it turns white and its ink ring draws round it. */
export function PlanOption({
  on,
  dim,
  disabled,
  onPress,
  testID,
  children,
}: {
  readonly on: boolean;
  readonly dim: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly testID: string;
  readonly children: ReactNode;
}) {
  const mayMove = useMayMove();
  const picked = useSharedValue(on ? 1 : 0);
  const ringed = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    const to = on ? 1 : 0;
    if (!mayMove) {
      picked.value = to;
      ringed.value = to;
      return;
    }
    picked.value = withTiming(to, { duration: COLOUR_MS, easing: CSS_EASE, reduceMotion: ALWAYS });
    ringed.value = withTiming(to, {
      duration: RING_MS,
      easing: SPRING_CURVE,
      reduceMotion: ALWAYS,
    });
  }, [on, mayMove, picked, ringed]);
  const paperStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(picked.value, [0, 1], [paper.faint, paper.white]),
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringed.value }));
  return (
    <PressSpring
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      feedback="choice"
      pressScale={PAPER_PRESS}
      restOpacity={dim ? 0.38 : 1}
      style={styles.plan}
    >
      <Animated.View pointerEvents="none" style={[styles.fill, paperStyle]} />
      <Animated.View pointerEvents="none" style={[styles.fill, styles.ring, ringStyle]} />
      {children}
    </PressSpring>
  );
}

/**
 * The amount in his hand. Each time it changes it is written again from the left: a strip of
 * the receipt's paper over it slides off to the right.
 */
export function WrittenAmount({
  writeKey,
  children,
}: {
  readonly writeKey: string;
  readonly children: ReactNode;
}) {
  const mayMove = useMayMove();
  const covered = useSharedValue(mayMove ? 1 : 0);
  useEffect(() => {
    if (!mayMove) return;
    covered.value = 1;
    covered.value = withTiming(0, {
      duration: WRITE_MS,
      easing: SPRING_CURVE,
      reduceMotion: ALWAYS,
    });
  }, [writeKey, mayMove, covered]);
  const cover = useAnimatedStyle(() => ({ transform: [{ scaleX: covered.value }] }));
  return (
    <View>
      {children}
      <Animated.View pointerEvents="none" style={[styles.cover, cover]} />
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: -BITE / 2,
    left: 0,
    right: 0,
    height: BITE,
    flexDirection: 'row',
    gap: BITE_EVERY - BITE,
    paddingLeft: BITE_EVERY / 2 - BITE / 2,
    overflow: 'hidden',
    zIndex: 1,
  },
  bite: { width: BITE, height: BITE, borderRadius: BITE / 2, backgroundColor: paper.page },
  plan: {
    flexGrow: 1,
    flexBasis: 140,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 11,
    gap: 1,
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 },
  ring: {
    boxShadow: 'inset 0 0 0 2px #1C1A18, 0 6px 16px rgba(60,40,20,0.10)',
  },
  cover: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // A hair past the glyphs, so no edge of a letter shows before its turn.
    left: -2,
    right: -2,
    backgroundColor: paper.sheet,
    transformOrigin: 'right',
  },
});
