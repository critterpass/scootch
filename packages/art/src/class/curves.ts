/**
 * The classroom's curves and the shape of a loop, shared by `motion.ts` and `prop-loops.ts`.
 */

/** A cubic-bezier easing: x1, y1, x2, y2. */
export type Curve = readonly [number, number, number, number];

export const CURVES = {
  /** Sheets, morphs, presses. 200 to 540 ms. */
  interface: [0.32, 0.72, 0, 1],
  /** His pops, bubbles, stamps, chips: overshoot, then settle. 340 to 480 ms. */
  character: [0.34, 1.56, 0.64, 1],
  /** Pulling back to the room, pushing in to the desk. */
  camera: [0.7, 0, 0.2, 1],
  /** His walk to a new spot. */
  walk: [0.45, 0, 0.25, 1],
  /** Chalk writing itself on, a red check drawing. */
  ink: [0.65, 0, 0.35, 1],
  /** CSS's `ease`: colour and opacity changes. */
  ease: [0.25, 0.1, 0.25, 1],
  /** A loop's back-and-forth. */
  easeInOut: [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, Curve>;

/** One keyframe: when (0 to 1 of the period) and the values there. */
export interface Keyframe {
  readonly at: number;
  readonly x?: number;
  readonly y?: number;
  readonly rotate?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly opacity?: number;
}

export interface Loop {
  readonly periodMs: number;
  /** Where in the period it starts, as the board's negative delay does. */
  readonly offsetMs?: number;
  /** Each segment eases with this curve, as CSS applies `animation-timing-function` per keyframe. */
  readonly curve: Curve;
  readonly frames: readonly Keyframe[];
}

export const swing = (periodMs: number, from: number, to: number, offsetMs = 0): Loop => ({
  periodMs,
  offsetMs,
  curve: CURVES.easeInOut,
  frames: [
    { at: 0, rotate: from },
    { at: 0.5, rotate: to },
    { at: 1, rotate: from },
  ],
});
