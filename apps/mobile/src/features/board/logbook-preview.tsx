import type { SkTypeface } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { boardPull, boardPullHeld, PULL_SETTLE } from '../../ui/motion/hand-off';
import { BOUNCE_CURVE } from '../../ui/motion/motion-tokens';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { LogbookPage } from '../logbook/logbook-page';
import { logbookPull } from '../logbook/logbook-pull';
import type { LogbookRow } from '../logbook/logbook-rows';

import { clamp01 } from './board-grow';
import { BOARD, PAPER } from './chalk';

/** The logbook's hint turns from "pull" to "let go" here. */
const HINT_TURNS = BOARD.logbookOpensPast / BOARD.logbookTravel;
/** The heading follows a third of the pull, and springs home on the character curve. */
const HEADER_FOLLOWS = 0.35;
const HEADER_HOME = {
  duration: 460,
  easing: BOUNCE_CURVE,
  reduceMotion: ReduceMotion.Never,
} as const;
/** The hint's arrow turns to point back up as the page passes the mark. */
const ARROW_TURN = {
  duration: 240,
  easing: BOUNCE_CURVE,
  reduceMotion: ReduceMotion.Never,
} as const;

/**
 * The pull down on the board's heading. The page follows the finger; let go past the mark, or
 * flick, and the page carries on down with the finger's speed while the logbook route opens over
 * it. Anything less springs back with that speed.
 */
export function useLogbookPull() {
  const router = useRouter();
  const { mayMove } = useFeel();
  const open = useCallback(() => router.push('/logbook'), [router]);
  const header = useSharedValue(0);
  // The desk's pull is still bringing the board down: a finger there is the desk's, not the page's.
  const stillArriving = () => {
    'worklet';
    return boardPullHeld.get() || boardPull.get() < 0.98;
  };
  const headerPan = usePanGesture({
    activeOffsetY: 10,
    failOffsetY: -10,
    failOffsetX: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      if (!mayMove || stillArriving()) return;
      const pulled = Math.max(0, event.translationY);
      logbookPull.set(clamp01(pulled / BOARD.logbookTravel));
      header.set(pulled * HEADER_FOLLOWS);
    },
    onDeactivate: (event) => {
      'worklet';
      const velocity = event.velocityY / BOARD.logbookTravel;
      const opens =
        !event.canceled &&
        !stillArriving() &&
        event.velocityY > -BOARD.flick &&
        (event.translationY > BOARD.logbookOpensPast || event.velocityY > BOARD.flick);
      header.set(withTiming(0, HEADER_HOME));
      if (opens) {
        if (mayMove) logbookPull.set(withSpring(1, { ...PULL_SETTLE, velocity }));
        scheduleOnRN(open);
      } else {
        logbookPull.set(withSpring(0, { ...PULL_SETTLE, velocity }));
      }
    },
  });
  const headerFollows = useAnimatedStyle(() => ({ transform: [{ translateY: header.get() }] }));
  return { open, headerPan, headerFollows };
}

/**
 * The logbook page as it lowers over the board, with the board dimming under it. Drawn on the
 * board for the length of the pull; the logbook route draws the same page once it opens.
 */
export function LogbookPreview({
  rows,
  week,
  hand,
}: {
  readonly rows: readonly LogbookRow[];
  readonly week: number;
  readonly hand: SkTypeface | null;
}) {
  const t = useT();
  const { size, allowFontScaling } = useScreenStyle();
  const { height } = useWindowDimensions();
  const dim = useAnimatedStyle(() => ({ opacity: logbookPull.get() }));
  const lowering = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - logbookPull.get()) * height * 1.02 }],
    shadowOpacity: logbookPull.get() > 0 && logbookPull.get() < 1 ? 0.28 : 0.12,
  }));
  const turn = useSharedValue(0);
  useAnimatedReaction(
    () => logbookPull.get() > HINT_TURNS,
    (over, before) => {
      if (before !== null && over !== before) turn.set(withTiming(over ? 180 : 0, ARROW_TURN));
    },
  );
  const hint = useAnimatedStyle(() => ({ opacity: clamp01(logbookPull.get() * 3) }));
  const pullHint = useAnimatedStyle(() => ({ opacity: logbookPull.get() > HINT_TURNS ? 0 : 1 }));
  const releaseHint = useAnimatedStyle(() => ({
    opacity: logbookPull.get() > HINT_TURNS ? 1 : 0,
  }));
  const arrow = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));
  const hintText = [styles.hintText, { color: PAPER.light.red, fontSize: size(17) }];

  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dim]} />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, styles.lowering, lowering]}
      >
        <LogbookPage
          rows={rows}
          week={week}
          hand={hand}
          hint={
            <Animated.View style={[styles.hint, hint]}>
              <Animated.View style={[styles.hintRow, pullHint]}>
                <Animated.Text allowFontScaling={allowFontScaling} style={[hintText, arrow]}>
                  ↓
                </Animated.Text>
                <Text allowFontScaling={allowFontScaling} style={[hintText, styles.hintLabel]}>
                  {t('board.logbookHint.pull')}
                </Text>
              </Animated.View>
              <Animated.View style={[styles.hintRow, styles.hintOver, releaseHint]}>
                <Animated.Text allowFontScaling={allowFontScaling} style={[hintText, arrow]}>
                  ↓
                </Animated.Text>
                <Text allowFontScaling={allowFontScaling} style={[hintText, styles.hintLabel]}>
                  {t('board.logbookHint.release')}
                </Text>
              </Animated.View>
            </Animated.View>
          }
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(8,20,16,0.4)',
  },
  lowering: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 20,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  hintOver: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  hintLabel: {
    flexShrink: 1,
  },
  hintText: {
    fontFamily: HAND_FAMILY,
    textAlign: 'center',
  },
});
