import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { logbookPull } from '../logbook/logbook-pull';
import { goBack } from '../../ui/motion/go-back';
import { boardPull, boardPullHeld, chalkboardFrame } from '../../ui/motion/hand-off';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';

import { BOARD, DESIGN_CHALKBOARD, DESIGN_SCREEN } from './chalk';

export const ALWAYS = ReduceMotion.Never;
export const SETTLE = { duration: 420, dampingRatio: 0.9, reduceMotion: ALWAYS } as const;
/** Let go of the desk's pull past this much of the way and the board springs open. */
const OPENS_PAST = 0.35;

export function clamp01(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

/**
 * The board growing out of the chalkboard on the desk. While the desk's finger is down it follows
 * the pull; when it lets go it springs open, or back to the desk. The ledge's push, or its tap,
 * runs it back to the chalkboard before the route goes. Where nothing may move it cuts.
 */
export function useBoardGrow(width: number, height: number) {
  const router = useRouter();
  const { mayMove, haptics } = useFeel();

  const leave = useCallback(() => goBack(router, '/'), [router]);
  const shrinkThenLeave = () => {
    'worklet';
    boardPull.set(
      withTiming(
        0,
        { duration: BOARD.closeMs, easing: SPRING_CURVE, reduceMotion: ALWAYS },
        (finished) => {
          if (finished) scheduleOnRN(leave);
        },
      ),
    );
  };
  const close = useCallback(() => {
    if (haptics) touchHaptic('choice');
    if (!mayMove) {
      boardPull.set(0);
      leave();
      return;
    }
    shrinkThenLeave();
  }, [haptics, mayMove, leave]);

  // The board opens once, as it arrives; leaving, it hands the desk back at rest.
  useEffect(() => {
    if (!mayMove) boardPull.set(1);
    else if (!boardPullHeld.get()) {
      boardPull.set(
        withTiming(1, { duration: BOARD.openMs, easing: SPRING_CURVE, reduceMotion: ALWAYS }),
      );
    }
    return () => {
      cancelAnimation(boardPull);
      boardPull.set(0);
      logbookPull.set(0);
    };
  }, []);

  // The desk's finger let go: open, or back to the desk.
  useAnimatedReaction(
    () => boardPullHeld.get(),
    (held, before) => {
      if (before !== true || held) return;
      if (boardPull.get() >= OPENS_PAST) boardPull.set(withSpring(1, SETTLE));
      else shrinkThenLeave();
    },
  );

  // Without a chalkboard published, the one the App board draws on its phone, scaled.
  const fallback = {
    x: (DESIGN_CHALKBOARD.x / DESIGN_SCREEN.width) * width,
    y: (DESIGN_CHALKBOARD.y / DESIGN_SCREEN.height) * height,
    width: (DESIGN_CHALKBOARD.width / DESIGN_SCREEN.width) * width,
    height: (DESIGN_CHALKBOARD.height / DESIGN_SCREEN.height) * height,
  };
  const clip = useAnimatedStyle(() => {
    const frame = chalkboardFrame.get() ?? fallback;
    const rest = 1 - clamp01(boardPull.get());
    const top = frame.y * rest;
    const left = frame.x * rest;
    const right = (width - frame.x - frame.width) * rest;
    const bottom = (height - frame.y - frame.height) * rest;
    return {
      top,
      left,
      width: width - left - right,
      height: height - top - bottom,
      borderRadius: 6 * rest,
    };
  });
  const inner = useAnimatedStyle(() => {
    const frame = chalkboardFrame.get() ?? fallback;
    const rest = 1 - clamp01(boardPull.get());
    return { transform: [{ translateX: -frame.x * rest }, { translateY: -frame.y * rest }] };
  });
  const content = useAnimatedStyle(() => ({ opacity: clamp01((boardPull.get() - 0.15) / 0.45) }));

  const ledgePan = usePanGesture({
    activeOffsetY: -8,
    failOffsetX: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      if (mayMove) boardPull.set(clamp01(1 + Math.min(0, event.translationY) / BOARD.closeTravel));
    },
    onDeactivate: (event) => {
      'worklet';
      const closes =
        !event.canceled &&
        (event.translationY < -BOARD.closesPast || event.velocityY < -BOARD.flick);
      if (closes) scheduleOnRN(close);
      else boardPull.set(withSpring(1, SETTLE));
    },
  });

  return { clip, inner, content, close, ledgePan };
}
