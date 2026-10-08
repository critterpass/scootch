import {
  FadeIn,
  ReduceMotion,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import { CROSSFADE_MS, SPRING_CURVE } from '../../../ui/motion/motion-tokens';

// "Park a thought" and the field it opens are one control in two shapes. Neither is cut to: the
// dock opens out of the pill's shape and rises into place, the line above it follows, and when the
// field closes the pill settles back from the dock's width.

const OPEN_MS = 440;
const SETTLE_MS = 380;
// Whether anything moves is decided by the screen, so no animation asks the system again.
const ALWAYS = ReduceMotion.Never;
const calm = FadeIn.duration(CROSSFADE_MS).reduceMotion(ALWAYS);

/** The dock, opening out of the pill: narrow and a little low at first, then its full width. */
const dockOpens: EntryExitAnimationFunction = () => {
  'worklet';
  const move = { duration: OPEN_MS, easing: SPRING_CURVE, reduceMotion: ALWAYS };
  return {
    // The dock is glass, which a see-through parent would flatten: it arrives by shape alone.
    initialValues: { transform: [{ translateY: 22 }, { scaleX: 0.46 }, { scaleY: 0.82 }] },
    animations: {
      transform: [
        { translateY: withTiming(0, move) },
        { scaleX: withTiming(1, move) },
        { scaleY: withTiming(1, move) },
      ],
    },
  };
};

/** The line above the dock, a moment after it: up a little and in. */
const lineFollows: EntryExitAnimationFunction = () => {
  'worklet';
  const move = { duration: 280, easing: SPRING_CURVE, reduceMotion: ALWAYS };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
    animations: {
      opacity: withDelay(140, withTiming(1, { duration: 200, reduceMotion: ALWAYS })),
      transform: [{ translateY: withDelay(140, withTiming(0, move)) }],
    },
  };
};

/** The pill, settling back from the dock's width once the field has closed. */
const pillSettles: EntryExitAnimationFunction = () => {
  'worklet';
  const move = { duration: SETTLE_MS, easing: SPRING_CURVE, reduceMotion: ALWAYS };
  return {
    initialValues: { opacity: 0.2, transform: [{ scaleX: 1.7 }, { scaleY: 1.12 }] },
    animations: {
      opacity: withTiming(1, { duration: 140, reduceMotion: ALWAYS }),
      transform: [{ scaleX: withTiming(1, move) }, { scaleY: withTiming(1, move) }],
    },
  };
};

/** How each part arrives; where nothing may move, each simply fades in. */
export function parkMotion(still: boolean) {
  return still
    ? { dock: calm, line: calm, pill: calm }
    : { dock: dockOpens, line: lineFollows, pill: pillSettles };
}
