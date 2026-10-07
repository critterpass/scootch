import type { WorkMode } from '@scootch/domain';

import { WORK_MODE_ATTACHMENTS } from '../scootch/work-mode-attachment';
import { clamp, frac, smooth, TAU } from './loop-math';
import { DESK_LOOPS } from './work-loops-desk';
import { HOME_LOOPS } from './work-loops-home';
import { BODY_LOOPS } from './work-loops-body';

/**
 * How one named value moves through its mode's loop. `turns` is how many times it repeats in one
 * loop; every kind starts at the value's rest, so the first frame of a loop is the still.
 */
export type LoopTrack =
  /** Runs 0 to 1 and starts over: steam rising, an envelope flying off. */
  | { readonly kind: 'cycle'; readonly turns: number }
  /** Swings -1 to 1 and back, as a sine. */
  | { readonly kind: 'swing'; readonly turns: number }
  /** Swings 0 to 1 and back, as a sine. */
  | { readonly kind: 'sway01'; readonly turns: number }
  /** Rises from 0 to 1 and falls back, smoothly: a mouth opening, a finger pressing. */
  | { readonly kind: 'pulse'; readonly turns: number }
  /** Lifts from 0 and lands again, like a step. */
  | { readonly kind: 'lift'; readonly turns: number }
  /** 0 except between two points of the loop, where it eases up to 1 and back. */
  | { readonly kind: 'window'; readonly from: number; readonly to: number }
  /** Fills from 0 to 1 over the first half of each turn and stays full; starts full. */
  | { readonly kind: 'fill'; readonly turns: number };

/** One mode's loop: how long it takes, and how each value the mode names moves through it. */
export interface WorkLoop {
  readonly seconds: number;
  readonly tracks: Readonly<Record<string, LoopTrack>>;
}

/**
 * Every work mode's loop, at the design's speeds. Nothing turns more than three times a second,
 * so nothing flickers.
 */
export const WORK_LOOPS: Readonly<Record<WorkMode, WorkLoop>> = {
  ...DESK_LOOPS,
  ...HOME_LOOPS,
  ...BODY_LOOPS,
};

const WINDOW_EASE = 0.25;

/** The value of one track at `u`, the position in the loop from 0 to 1, given its rest value. */
export function trackValue(track: LoopTrack, rest: number, u: number): number {
  // A loop starts on the rest value itself, not on a rounding of it.
  if (u === 0) return rest;
  switch (track.kind) {
    case 'cycle':
      return frac(rest + track.turns * u);
    case 'swing':
      return Math.sin(Math.asin(clamp(rest, -1, 1)) + TAU * track.turns * u);
    case 'sway01':
      return (Math.sin(Math.asin(clamp(rest * 2 - 1, -1, 1)) + TAU * track.turns * u) + 1) / 2;
    case 'pulse':
      return (1 - Math.cos(TAU * track.turns * u)) / 2;
    case 'lift':
      return Math.abs(Math.sin(Math.PI * track.turns * u));
    case 'window': {
      const k = (frac(u) - track.from) / (track.to - track.from);
      if (k <= 0 || k >= 1) return 0;
      return Math.min(smooth(k / WINDOW_EASE), smooth((1 - k) / WINDOW_EASE));
    }
    case 'fill':
      return Math.min(1, frac(0.5 + track.turns * u) * 2);
  }
}

/** A mode's loop values at `u`, the position in its loop from 0 to 1. */
export function workLoopAt(mode: WorkMode, u: number): Record<string, number> {
  const rest = WORK_MODE_ATTACHMENTS[mode].rest;
  const values: Record<string, number> = {};
  for (const [name, track] of Object.entries(WORK_LOOPS[mode].tracks)) {
    values[name] = trackValue(track, rest[name] ?? 0, u);
  }
  return values;
}

/**
 * The values a work mode names, at `t` seconds into its loop. At zero they are the mode's rest
 * values, and the loop repeats exactly every `WORK_LOOPS[mode].seconds`.
 */
export function workLoop(mode: WorkMode, t: number): Record<string, number> {
  return workLoopAt(mode, frac(t / WORK_LOOPS[mode].seconds));
}
