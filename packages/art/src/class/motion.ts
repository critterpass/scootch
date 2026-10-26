/**
 * How the classroom moves, as data: the three curves, the camera's timing, and every loop a layer
 * names in its `motion`. Numbers come from the Motion, Rig, Phu, Prop, Room and App boards. A loop
 * is keyframes over one period; the app runs them with Reanimated, a sheet can sample them with
 * `sampleLoop` (loop-sample.ts). Under Reduce Motion the camera cuts and nothing loops (brief, section 6).
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
  /** A loop's back-and-forth. */
  easeInOut: [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, Curve>;

export const TIMING = {
  /** A camera move between framings. */
  cameraMs: 1150,
  /** Under Reduce Motion the camera cuts behind a fade this long. */
  cameraCutFadeMs: 200,
  /** Pressure moves one step per change, with a little overshoot. */
  pressureStepMs: 450,
  /** He squash-pops into a new pose. */
  posePopMs: 480,
  /** Serious mode crossfades in, with no overshoot. */
  seriousFadeMs: 600,
  /** He walks to a new spot. */
  walkToMs: 1300,
  /** A blink, and the gap between blinks. */
  blinkMs: 120,
  blinkEveryMs: [2500, 6000],
  /** While pacing, he stops to look at you this often, for this long. */
  paceLookEveryMs: [4500, 8500],
  paceLookMs: 1600,
} as const;

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

const swing = (periodMs: number, from: number, to: number, offsetMs = 0): Loop => ({
  periodMs,
  offsetMs,
  curve: CURVES.easeInOut,
  frames: [
    { at: 0, rotate: from },
    { at: 0.5, rotate: to },
    { at: 1, rotate: from },
  ],
});

/** Every loop a layer can name. Transforms are about the layer's pivot. */
export const LOOPS = {
  /** His body: scale y 1 to 1.022, from his feet. */
  breathe: {
    periodMs: 3200,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleX: 1, scaleY: 1 },
      { at: 0.5, scaleX: 1.012, scaleY: 1.022 },
      { at: 1, scaleX: 1, scaleY: 1 },
    ],
  },
  /** His head follows the breath 80 ms behind. */
  breatheHead: {
    periodMs: 3200,
    offsetMs: -80,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 0 },
      { at: 0.5, y: -1.6 },
      { at: 1, y: 0 },
    ],
  },
  /** A foot while he walks: up 7, tipped 10 degrees, every 520 ms; the right foot half a step later. */
  step: {
    periodMs: 520,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 0, rotate: 0 },
      { at: 0.25, y: -7, rotate: -10 },
      { at: 0.5, y: 0, rotate: 0 },
      { at: 1, y: 0, rotate: 0 },
    ],
  },
  /** Across the front of the room, as the Room board paces him (room units). */
  pace: {
    periodMs: 10000,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, x: -170 },
      { at: 0.45, x: 170 },
      { at: 0.55, x: 170 },
      { at: 1, x: -170 },
    ],
  },
  /** On a phone, as the App board paces him: he turns to face the way he walks (room units). */
  paceWide: {
    periodMs: 10000,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, x: 0, scaleX: -1 },
      { at: 0.2, x: 160, scaleX: -1 },
      { at: 0.24, x: 160, scaleX: 1 },
      { at: 0.7, x: -160, scaleX: 1 },
      { at: 0.74, x: -160, scaleX: -1 },
      { at: 1, x: 0, scaleX: -1 },
    ],
  },
  /** Pressure 3: two taps of 160 ms, then a 1.6 s rest. */
  rulerTap: {
    periodMs: 1920,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, rotate: 0 },
      { at: 0.042, rotate: 3 },
      { at: 0.083, rotate: 0 },
      { at: 0.125, rotate: 3 },
      { at: 0.167, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
  /** The red tap mark flashes with each tap. */
  tapMark: {
    periodMs: 1920,
    curve: CURVES.linear,
    frames: [
      { at: 0, opacity: 0 },
      { at: 0.042, opacity: 1 },
      { at: 0.083, opacity: 0 },
      { at: 0.125, opacity: 1 },
      { at: 0.167, opacity: 0 },
      { at: 1, opacity: 0 },
    ],
  },
  /** Pressure 1: a 1.4 s sip every 7 s, eyes staying on you. */
  sip: {
    periodMs: 7000,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 0, rotate: 0 },
      { at: 0.05, y: -8, rotate: 8 },
      { at: 0.15, y: -8, rotate: 8 },
      { at: 0.2, y: 0, rotate: 0 },
      { at: 1, y: 0, rotate: 0 },
    ],
  },
  /** Pressure 4: the steam puffs drift up 0.8 s and fade. */
  puffSteam: {
    periodMs: 800,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 4, opacity: 0.6, scaleX: 0.9, scaleY: 0.9 },
      { at: 0.5, y: 0, opacity: 1, scaleX: 1, scaleY: 1 },
      { at: 1, y: -6, opacity: 0.6, scaleX: 1.05, scaleY: 1.05 },
    ],
  },
  teaSteam: {
    periodMs: 2400,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 4, opacity: 0, scaleY: 0.8 },
      { at: 0.4, opacity: 0.8 },
      { at: 1, y: -8, opacity: 0, scaleY: 1.1 },
    ],
  },
  wave: swing(900, -10, 12),
  vein: {
    periodMs: 1100,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleX: 1, scaleY: 1 },
      { at: 0.5, scaleX: 1.15, scaleY: 1.15 },
      { at: 1, scaleX: 1, scaleY: 1 },
    ],
  },
  sparkle: {
    periodMs: 1400,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, opacity: 1, scaleX: 1, scaleY: 1 },
      { at: 0.5, opacity: 0.6, scaleX: 0.85, scaleY: 0.85 },
      { at: 1, opacity: 1, scaleX: 1, scaleY: 1 },
    ],
  },
  zzz: {
    periodMs: 2400,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 2, opacity: 0.5 },
      { at: 0.5, y: -2, opacity: 1 },
      { at: 1, y: 2, opacity: 0.5 },
    ],
  },
  strand: swing(1600, -4, 4),
  talk: {
    periodMs: 260,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleY: 1 },
      { at: 0.5, scaleY: 0.85 },
      { at: 1, scaleY: 1 },
    ],
  },
  /** The wall fan. */
  fan: {
    periodMs: 1100,
    curve: CURVES.linear,
    frames: [
      { at: 0, rotate: 0 },
      { at: 1, rotate: 360 },
    ],
  },
  /** The clock's second hand: sixty steps a minute. */
  clockTick: {
    periodMs: 60000,
    curve: CURVES.linear,
    frames: Array.from({ length: 61 }, (_, i) => [
      { at: i / 60, rotate: i * 6 },
      ...(i < 60 ? [{ at: (i + 1) / 60 - 1e-6, rotate: i * 6 }] : []),
    ]).flat(),
  },
  // The props, from the Prop board's CSS.
  legA: swing(460, 16, -16),
  legB: swing(460, 16, -16, -230),
  tail: swing(1300, 0, 12),
  head: {
    periodMs: 920,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 0 },
      { at: 0.5, y: -1.5 },
      { at: 1, y: 0 },
    ],
  },
  flame: {
    periodMs: 900,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleX: 1, scaleY: 1, rotate: -2 },
      { at: 0.5, scaleX: 0.9, scaleY: 1.1, rotate: 3 },
      { at: 1, scaleX: 1, scaleY: 1, rotate: -2 },
    ],
  },
  glow: {
    periodMs: 1800,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, opacity: 0.22, scaleX: 1, scaleY: 1 },
      { at: 0.5, opacity: 0.34, scaleX: 1.12, scaleY: 1.12 },
      { at: 1, opacity: 0.22, scaleX: 1, scaleY: 1 },
    ],
  },
  drip: {
    periodMs: 1200,
    curve: [0.42, 0, 1, 1],
    frames: [
      { at: 0, y: -12, opacity: 0 },
      { at: 0.25, opacity: 1 },
      { at: 1, y: 16, opacity: 0 },
    ],
  },
  wingL: {
    periodMs: 360,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleX: 1 },
      { at: 0.5, scaleX: 0.35 },
      { at: 1, scaleX: 1 },
    ],
  },
  wingR: {
    periodMs: 360,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleX: 1 },
      { at: 0.5, scaleX: 0.35 },
      { at: 1, scaleX: 1 },
    ],
  },
  steam: {
    periodMs: 2400,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 4, opacity: 0, scaleY: 0.8 },
      { at: 0.4, opacity: 0.8 },
      { at: 1, y: -8, opacity: 0, scaleY: 1.1 },
    ],
  },
} as const satisfies Record<string, Loop>;
export type LoopName = keyof typeof LOOPS;

/** The thrown chalk at pressure 4, in screen points: it flies at you and misses. */
export const CHALK_THROW = {
  delayMs: 500,
  durationMs: 640,
  curve: [0.45, 0, 0.9, 0.6],
  piece: { width: 20, height: 7, radius: 3, color: '#FFFFFF' },
  from: { x: 274, y: 330 },
  to: { dx: -150, dy: 250, scale: 3.4, rotate: 560 },
  /** The puff where it lands. */
  puff: { x: 96, y: 548, size: 90, delayMs: 1120, durationMs: 700 },
} as const;
