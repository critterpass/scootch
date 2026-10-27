import { withTiming, type SharedValue } from 'react-native-reanimated';

import { SPRING_CURVE } from '../../ui/motion/motion-tokens';

/**
 * The ShareSheet board's `.card` change: the picked card comes in from its side, turned a little
 * and at 0.92, and the one before goes out the other way: opacity over 320 ms and the turn over
 * 420 ms, both on the interface curve. `side` holds +1 for a card to the right of the last, -1 left; it is read as the swap starts.
 */
export function cardIn(sideValue: SharedValue<number>) {
  return () => {
    'worklet';
    const side = sideValue.value;
    const fade = { duration: 320, easing: SPRING_CURVE };
    const move = { duration: 420, easing: SPRING_CURVE };
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: side * 36 }, { rotate: `${side * 4}deg` }, { scale: 0.92 }],
      },
      animations: {
        opacity: withTiming(1, fade),
        transform: [
          { translateX: withTiming(0, move) },
          { rotate: withTiming('0deg', move) },
          { scale: withTiming(1, move) },
        ],
      },
    };
  };
}

export function cardOut(sideValue: SharedValue<number>) {
  return () => {
    'worklet';
    const side = sideValue.value;
    const fade = { duration: 320, easing: SPRING_CURVE };
    const move = { duration: 420, easing: SPRING_CURVE };
    return {
      initialValues: {
        opacity: 1,
        transform: [{ translateX: 0 }, { rotate: '0deg' }, { scale: 1 }],
      },
      animations: {
        opacity: withTiming(0, fade),
        transform: [
          { translateX: withTiming(-side * 36, move) },
          { rotate: withTiming(`${-side * 4}deg`, move) },
          { scale: withTiming(0.92, move) },
        ],
      },
    };
  };
}
