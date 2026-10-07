/** The catches are drawn on the board's phone: 393 by 852 points, scaled to the phone in hand. */
export const STAGE: { readonly width: number; readonly height: number; readonly middle: number } = {
  width: 393,
  height: 852,
  middle: 196,
};

export type Point = readonly [number, number];

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (value: number, low = 0, high = 1): number =>
  Math.max(low, Math.min(high, value));
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number): number => t * t * t;
export const inOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** Overshoots a little and settles, as something sprung does. */
export const back = (t: number): number => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/** A value moving through keyframes: `[[0, a], [0.4, b], [1, c]]` at `t`. */
export function keyed(t: number, frames: readonly (readonly [number, number])[]): number {
  const first = frames[0];
  if (!first) return 0;
  let before = first;
  for (const frame of frames) {
    if (t <= frame[0]) {
      const span = frame[0] - before[0];
      return span <= 0 ? frame[1] : lerp(before[1], frame[1], (t - before[0]) / span);
    }
    before = frame;
  }
  return before[1];
}

export const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
