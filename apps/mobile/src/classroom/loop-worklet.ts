import type { Curve, Loop } from '@phusclass/art/class';

/**
 * The classroom's loops, sampled on the UI thread. The same maths as the art package's
 * `sampleLoop`, written as worklets so a frame never waits for JavaScript.
 */

export interface LoopValues {
  x: number;
  y: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

/** A layer at rest. */
export const REST: LoopValues = { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 };

const KEYS = ['x', 'y', 'rotate', 'scaleX', 'scaleY', 'opacity'] as const;

/** A cubic-bezier easing at `x` (0 to 1), as CSS eases one keyframe segment. */
export function easeWorklet(curve: Curve, x: number): number {
  'worklet';
  const [x1, y1, x2, y2] = curve;
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

/** A loop's values `ms` into it. A value no keyframe names stays at rest. */
export function sampleLoopWorklet(loop: Loop, ms: number): LoopValues {
  'worklet';
  const out: LoopValues = { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 };
  const period = loop.periodMs;
  const p = ((((ms - (loop.offsetMs ?? 0)) % period) + period) % period) / period;
  for (const key of KEYS) {
    let before = -1;
    let after = -1;
    let first = -1;
    let last = -1;
    for (let i = 0; i < loop.frames.length; i += 1) {
      const frame = loop.frames[i];
      if (frame === undefined || frame[key] === undefined) continue;
      if (first < 0) first = i;
      last = i;
      if (frame.at < p) before = i;
      else if (after < 0) after = i;
    }
    if (first < 0) continue;
    const a = loop.frames[before];
    const b = loop.frames[after];
    const av = a?.[key];
    const bv = b?.[key];
    if (a === undefined || b === undefined || av === undefined || bv === undefined) {
      const edge = loop.frames[after === first ? first : last]?.[key];
      if (edge !== undefined) out[key] = edge;
      continue;
    }
    const t = b.at === a.at ? 1 : easeWorklet(loop.curve, (p - a.at) / (b.at - a.at));
    out[key] = av + (bv - av) * t;
  }
  return out;
}
