import { Easing } from 'react-native-reanimated';

/**
 * The design's motion, as its boards script it: one place for every duration, distance and curve.
 * Times are milliseconds; distances are points.
 */

/** The spring-like curve the boards use for nearly everything: fast out, a long soft landing. */
export const SPRING_CURVE = Easing.bezier(0.32, 0.72, 0, 1);
/** The bouncy curve, for things that land with a little overshoot. */
export const BOUNCE_CURVE = Easing.bezier(0.34, 1.56, 0.64, 1);
/** The card's flip. */
export const FLIP_CURVE = Easing.bezier(0.45, 0, 0.2, 1);
export const EASE_OUT = Easing.out(Easing.quad);

/** A press: down to 0.95, then back through 1.02 at 55% of the way to rest. */
export const PRESS = {
  downMs: 140,
  downScale: 0.95,
  upMs: 420,
  overshootScale: 1.02,
  overshootAt: 0.55,
  /** What a press looks like when nothing may move: a dip in opacity. */
  calmOpacity: 0.82,
} as const;

/** A screen, or a part of one, rising in. Siblings follow each other by the stagger. */
export const RISE = {
  ms: 900,
  fromY: 28,
  fromScale: 0.985,
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

/** A stamp thumping down: in big and turned, squashed on landing, then settled. */
export const STAMP = {
  fromScale: 2.2,
  fromTurnDeg: -12,
  landMs: 450,
  landScale: 0.92,
  landTurnDeg: 2,
  bounceMs: 250,
  bounceScale: 1.04,
  settleMs: 200,
} as const;

/** A toast dropping from the Island, holding, then tucking back up. */
export const TOAST = {
  inMs: 560,
  fromY: -36,
  fromScale: 0.9,
  holdMs: 2600,
  outMs: 620,
  toY: -30,
  toScale: 0.94,
} as const;

/** How long a rising part waits for its turn. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(0, index), RISE.maxStaggered) * RISE.staggerMs;
}
