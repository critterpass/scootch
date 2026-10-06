/** The floor an exponential ramp starts from and falls to: 80 dB below full scale. */
const FLOOR = 0.0001;

/**
 * A struck-note envelope: an exponential rise from near silence to `peak` over `attack` seconds,
 * then an exponential fall back to near silence at `end` seconds. Silent outside `[0, end)`.
 */
export function strike(t: number, attack: number, peak: number, end: number): number {
  if (t < 0 || t >= end) return 0;
  const top = Math.max(peak, FLOOR * 2);
  if (t < attack) return FLOOR * Math.pow(top / FLOOR, t / attack);
  return top * Math.pow(FLOOR / top, (t - attack) / Math.max(end - attack, 1e-6));
}

/** A frequency that slides exponentially from `from` to `to` over `seconds`, then holds. */
export function expGlide(from: number, to: number, seconds: number): (t: number) => number {
  return (t) => (t >= seconds ? to : from * Math.pow(to / from, t / seconds));
}

/** A value that moves in straight lines through `[time, value]` points, holding the last one. */
export function linearPoints(
  points: readonly (readonly [number, number])[],
): (t: number) => number {
  return (t) => {
    let [prevTime, prevValue] = points[0] ?? [0, 0];
    for (const [time, value] of points) {
      if (t < time) {
        const span = time - prevTime;
        return span <= 0 ? value : prevValue + ((value - prevValue) * (t - prevTime)) / span;
      }
      prevTime = time;
      prevValue = value;
    }
    return prevValue;
  };
}
