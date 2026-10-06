import { clamp, smooth } from './loop-math';

/** One wobble of the waiting egg: over, back past the middle, home, then a pause. */
export const EGG_WOBBLE_SECONDS = 1.22;
export const EGG_WOBBLE_DEGREES = 5;
const WOBBLE_OVER = 0.18;
const WOBBLE_BACK = 0.54;
const WOBBLE_HOME = 0.72;

/** The egg's tilt in degrees at `t` seconds. Zero at zero, and it repeats every wobble. */
export function eggWobble(t: number): number {
  'worklet';
  const at = ((t % EGG_WOBBLE_SECONDS) + EGG_WOBBLE_SECONDS) % EGG_WOBBLE_SECONDS;
  if (at < WOBBLE_OVER) return EGG_WOBBLE_DEGREES * smooth(at / WOBBLE_OVER);
  if (at < WOBBLE_BACK)
    return EGG_WOBBLE_DEGREES * (1 - 2 * smooth((at - WOBBLE_OVER) / (WOBBLE_BACK - WOBBLE_OVER)));
  if (at < WOBBLE_HOME)
    return -EGG_WOBBLE_DEGREES * (1 - smooth((at - WOBBLE_BACK) / (WOBBLE_HOME - WOBBLE_BACK)));
  return 0;
}

export const HATCH_POP_SECONDS = 0.5;
const POP_OVERSHOOT = 1.70158;

export interface HatchPop {
  /** The monster's scale about its feet: from nothing, a little past full size, then full size. */
  readonly scale: number;
  /** 0 to 1; with Reduce Motion this alone is shown, as a crossfade. */
  readonly opacity: number;
}

/** The pop that brings a hatched monster in, `t` seconds after it arrives. Settled from the end on. */
export function hatchPop(t: number): HatchPop {
  'worklet';
  const k = clamp(t / HATCH_POP_SECONDS, 0, 1);
  const back = k - 1;
  return {
    scale: 1 + (POP_OVERSHOOT + 1) * back * back * back + POP_OVERSHOOT * back * back,
    opacity: smooth(k * 3),
  };
}

export const SHRINK_SECONDS = 0.6;
/** The design's half-second squash when a character changes: sin of one turn, dying away. */
export const SHRINK_REACTION_SECONDS = 0.5;

export interface ShrinkStep {
  /** 0 at the old size, 1 at the new one. */
  readonly progress: number;
  /** Extra width and height while it reacts; both 1 at rest. */
  readonly squashX: number;
  readonly squashY: number;
}

/**
 * A monster made smaller, `t` seconds after it was told it is too big: it shrinks with an ease
 * out, then gives one small squash. Settled at the new size from the end on.
 */
export function shrinkStep(t: number): ShrinkStep {
  'worklet';
  const k = clamp(t / SHRINK_SECONDS, 0, 1);
  const u = clamp((t - SHRINK_SECONDS) / SHRINK_REACTION_SECONDS, 0, 1);
  const wave = Math.sin(u * Math.PI * 2) * (1 - u);
  return { progress: 1 - (1 - k) ** 3, squashX: 1 + 0.09 * wave, squashY: 1 - 0.13 * wave };
}

/** The size factor between two sizes at a shrink step. */
export function shrinkFactor(from: number, to: number, step: ShrinkStep): number {
  'worklet';
  return from + (to - from) * step.progress;
}
