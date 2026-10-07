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

/** The egg's hop while it waits: one every so often, so it is never still for long. */
export const EGG_HOP_EVERY_SECONDS = 1.1;
const HOP_SHARE = 0.3;
/** From the monster's arrival to the burst: one hard shake as the cracks run across. */
export const EGG_SHAKE_SECONDS = 0.28;
/** The shell flying apart, over the monster as it pops out. */
export const EGG_BURST_SECONDS = 0.42;
export const EGG_SHARDS = 7;
/** How long a waiting egg takes to get as restless as it gets. */
const EAGER_SECONDS = 2.4;

/** How restless a waiting egg is `t` seconds in, 0 to 1: it rocks harder the longer it waits. */
export function eggEager(t: number): number {
  'worklet';
  return clamp(t / EAGER_SECONDS, 0, 1);
}

/** The egg's tilt in degrees: a rock that grows with `eager`, and a hard fast `shake` at the end. */
export function eggRock(t: number, eager: number, shake: number): number {
  'worklet';
  return Math.sin(t * (6 + 5 * eager + 26 * shake)) * (3 + 6 * eager + 9 * shake);
}

export interface EggHop {
  /** How far off the ground it is, as a share of its height. */
  readonly lift: number;
  readonly squashX: number;
  readonly squashY: number;
}

/** The hop of a waiting egg at `t` seconds: up, stretched, and down again; on the ground between. */
export function eggHop(t: number): EggHop {
  'worklet';
  const at =
    (((t % EGG_HOP_EVERY_SECONDS) + EGG_HOP_EVERY_SECONDS) % EGG_HOP_EVERY_SECONDS) /
    EGG_HOP_EVERY_SECONDS;
  if (at >= HOP_SHARE) return { lift: 0, squashX: 1, squashY: 1 };
  const up = Math.sin((at / HOP_SHARE) * Math.PI);
  return { lift: 0.08 * up, squashX: 1 - 0.05 * up, squashY: 1 + 0.07 * up };
}

/** How much of its crack a waiting egg shows `t` seconds in: the first of it within a second. */
export function eggCrack(t: number): number {
  'worklet';
  return 0.6 * smooth(clamp((t - 0.35) / 0.65, 0, 1));
}

export interface EggShard {
  /** Where the shard is from the egg's middle, as shares of the egg's box. */
  readonly x: number;
  readonly y: number;
  readonly turn: number;
  readonly opacity: number;
}

/** One piece of shell, `burst` (0 to 1) of the way through flying off: out, round, down and gone. */
export function eggShard(index: number, count: number, burst: number): EggShard {
  'worklet';
  const b = clamp(burst, 0, 1);
  const out = 1 - (1 - b) ** 3;
  // A fan over the top of the egg, wider than a half turn, each piece its own distance.
  const angle = -Math.PI / 2 + (index / Math.max(1, count - 1) - 0.5) * Math.PI * 1.5;
  const reach = 0.34 + 0.08 * ((index * 7) % 3);
  return {
    x: Math.cos(angle) * reach * out,
    y: Math.sin(angle) * reach * out + 0.3 * b * b,
    turn: (index % 2 === 0 ? 1 : -1) * 3.6 * out,
    opacity: 1 - smooth(clamp((b - 0.45) / 0.55, 0, 1)),
  };
}

/** The flash of the burst: a ring that opens out and fades. Radius as a share of the egg's box. */
export function eggRing(burst: number): { readonly radius: number; readonly opacity: number } {
  'worklet';
  const b = clamp(burst, 0, 1);
  return { radius: 0.16 + 0.44 * (1 - (1 - b) ** 3), opacity: 0.85 * (1 - b) };
}

export const HATCH_POP_SECONDS = 0.35;
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
