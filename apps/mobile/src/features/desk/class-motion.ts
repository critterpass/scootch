import { Easing, Keyframe } from 'react-native-reanimated';

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
