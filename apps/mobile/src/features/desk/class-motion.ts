import { useEffect } from 'react';
import {
  Easing,
  Keyframe,
  makeMutable,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { curves } from './class-style';

/** CSS's named curves, for the App board's keyframes that use them. */
export const css = {
  ease: Easing.bezier(0.25, 0.1, 0.25, 1),
  easeIn: Easing.bezier(0.42, 0, 1, 1),
  easeOut: Easing.bezier(0, 0, 0.58, 1),
  easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
} as const;

/** The board's `fade`: in from 4 points lower, 360 ms ease-out. For a word or a tag appearing. */
export const fadeUp = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 4 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: css.easeOut },
}).duration(360);

/**
 * The board's `stamp`: the grade comes down large, overshoots small and settles, turned 10 degrees,
 * 400 ms on the character curve after 280 ms.
 */
export const stampDown = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.9 }, { rotate: '-10deg' }] },
  70: { opacity: 1, transform: [{ scale: 0.94 }, { rotate: '-10deg' }], easing: curves.character },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '-10deg' }], easing: curves.character },
})
  .duration(400)
  .delay(280);

/**
 * The board's `popc`: a picked chip dips and springs past its size, 360 ms with every segment on
 * the character curve.
 */
export const chipPop = new Keyframe({
  0: { transform: [{ scale: 0.9 }] },
  60: { transform: [{ scale: 1.06 }], easing: curves.character },
  100: { transform: [{ scale: 1 }], easing: curves.character },
}).duration(360);

/** The board's `.ease` hide and show of a sheet's panel: opacity 300 ms `ease`, the move 520 ms. */
const SWAP = { fadeMs: 300, moveMs: 520, delayMs: 140, y: 10, scale: 0.985 } as const;

/** A panel coming in: it waits 140 ms for the one leaving, then rises the last 10 points. */
export function panelIn() {
  'worklet';
  const move = { duration: SWAP.moveMs, easing: curves.ui };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: SWAP.y }, { scale: SWAP.scale }] },
    animations: {
      opacity: withDelay(
        SWAP.delayMs,
        withTiming(1, { duration: SWAP.fadeMs, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      ),
      transform: [
        { translateY: withDelay(SWAP.delayMs, withTiming(0, move)) },
        { scale: withDelay(SWAP.delayMs, withTiming(1, move)) },
      ],
    },
  };
}

/** A panel leaving: at once, sinking 10 points as it fades. */
export function panelOut() {
  'worklet';
  const move = { duration: SWAP.moveMs, easing: curves.ui };
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: SWAP.fadeMs, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      transform: [
        { translateY: withTiming(SWAP.y, move) },
        { scale: withTiming(SWAP.scale, move) },
      ],
    },
  };
}

/**
 * A two-state value easing between 0 and 1, for a colour that follows a choice (the board's
 * `transition: background-color`). Where nothing may move it is set at once.
 */
export function useEased(on: boolean, ms: number, mayMove: boolean): SharedValue<number> {
  const value = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    value.set(mayMove ? withTiming(on ? 1 : 0, { duration: ms, easing: css.ease }) : on ? 1 : 0);
  }, [on, ms, mayMove, value]);
  return value;
}

/**
 * Between the desk's card and its composer, which the desk sheet lays out one above the other:
 * how tall the row of Late slip and Start is (0 when it is not there), and how far the composer
 * has grown over it to listen, 0 to 1. Listening, the composer covers the row, as the board draws.
 */
export const deskActionsHeight = makeMutable(0);
export const composerOver = makeMutable(0);
