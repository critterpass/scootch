/** Samples a loop from `motion.ts` at a moment, interpolated as CSS keyframes are. */
import type { Curve, Keyframe, Loop } from './motion';

/** The y of a cubic-bezier easing at x, found by bisection. */
function bezierY(curve: Curve, x: number): number {
  const [x1, y1, x2, y2] = curve;
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

const KEYS = ['x', 'y', 'rotate', 'scaleX', 'scaleY', 'opacity'] as const;
type Values = Record<(typeof KEYS)[number], number>;
const REST: Readonly<Values> = { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 };

/** A loop's values at a moment. A value no keyframe names stays at rest. */
export function sampleLoop(loop: Loop, ms: number): Values {
  const period = loop.periodMs;
  const p = ((((ms - (loop.offsetMs ?? 0)) % period) + period) % period) / period;
  const out: Values = { ...REST };
  for (const key of KEYS) {
    const frames = loop.frames.flatMap((f: Keyframe) => {
      const value = f[key];
      return value === undefined ? [] : [{ at: f.at, value }];
    });
    const first = frames[0];
    const last = frames.at(-1);
    if (!first || !last) continue;
    const next = frames.findIndex((f) => f.at >= p);
    const a = frames[next - 1];
    const b = frames[next];
    if (!a || !b) {
      out[key] = next === 0 ? first.value : last.value;
      continue;
    }
    const t = b.at === a.at ? 1 : bezierY(loop.curve, (p - a.at) / (b.at - a.at));
    out[key] = a.value + (b.value - a.value) * t;
  }
  return out;
}
