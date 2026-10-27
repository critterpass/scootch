import { Easing } from 'react-native-reanimated';

/**
 * The design's motion, as its boards script it: one place for every duration, distance and curve.
 * Times are milliseconds; distances are points.
 */

/** The Motion board's interface curve: sheets, morphs and presses. Fast out, a long soft landing. */
export const SPRING_CURVE = Easing.bezier(0.32, 0.72, 0, 1);
/** The Motion board's character curve: his pops, bubbles, stamps and chips. Overshoot, then settle. */
export const BOUNCE_CURVE = Easing.bezier(0.34, 1.56, 0.64, 1);
/** The card's flip. */
export const FLIP_CURVE = Easing.bezier(0.45, 0, 0.2, 1);
export const EASE_OUT = Easing.out(Easing.quad);
/** CSS's `ease`, which the boards use for colour and opacity changes. */
export const CSS_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * A press, as the App board's `.press`: down to 0.965 over 200 ms on the interface curve, and back
 * the same way, with no overshoot. A full-width row presses to 0.98 (the Settings board's `.cell`).
 */
export const PRESS = {
  scale: 0.965,
  ms: 200,
  /** What a press looks like when nothing may move: a dip in opacity. */
  calmOpacity: 0.82,
} as const;

/**
 * A pull letting go: it settles in about 555 ms with no overshoot, carrying the finger's speed.
 * On a spring, `duration` is perceptual and the spring runs for about one and a half times it.
 */
export const PULL_SPRING = { duration: 370, dampingRatio: 1 } as const;

/** A sheet, or a part of one, rising in (the Scholarship board's `.rise`). Siblings follow by the stagger. */
export const RISE = {
  ms: 560,
  fromY: 24,
  fromScale: 0.98,
  staggerMs: 70,
  maxStaggered: 8,
} as const;

/** What stands in for any entrance when nothing may move. */
export const CROSSFADE_MS = 200;

/** A reward eyebrow popping in. */
export const POP = {
  fromScale: 0.6,
  overScale: 1.12,
  overMs: 480,
  settleMs: 320,
} as const;

/**
 * A stamp coming down (the Tuition and Scholarship boards' `stampIn`): from 1.9 at nothing, it
 * lands at 0.94 by 55% and settles at 1, at the angle it rests at, on the character curve.
 */
export const STAMP = {
  ms: 520,
  fromScale: 1.9,
  landScale: 0.94,
  landAt: 0.55,
} as const;

/** A toast dropping from the Island, holding, then tucking back up. */
export const TOAST = {
  inMs: 560,
  fromY: -36,
  fromScale: 0.9,
  holdMs: 2600,
  outMs: 450,
  toY: -30,
  toScale: 0.94,
} as const;

/** How long a rising part waits for its turn. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(0, index), RISE.maxStaggered) * RISE.staggerMs;
}
