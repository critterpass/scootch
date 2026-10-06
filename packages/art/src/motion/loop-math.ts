import { hash, strHash } from '../core/rng';

export const TAU = Math.PI * 2;

/** The fractional part, always in [0, 1). */
export const frac = (value: number): number => ((value % 1) + 1) % 1;

// `clamp` and `smooth` carry the worklet mark, so the entrances built on them can run on the
// app's UI thread. Outside the app the mark is a plain string and does nothing.
export function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

/** Eases 0 to 1 with no speed at either end. */
export function smooth(value: number): number {
  'worklet';
  const k = clamp(value, 0, 1);
  return k * k * (3 - 2 * k);
}

/** A seeded value in [0, 1) for one numbered slot of one character. */
export function seeded(seed: string, slot: number): number {
  return hash(strHash(seed) + slot * 101);
}

/**
 * A short shut-and-open, 0 to 1, for an event that started `since` seconds ago and lasts
 * `length` seconds: a third closing, a third shut, a third opening.
 */
export function lid(since: number, length: number): number {
  if (since <= 0 || since >= length) return 0;
  const third = length / 3;
  if (since < third) return since / third;
  if (since > length - third) return (length - since) / third;
  return 1;
}

/**
 * When the numbered event of an irregular rhythm starts: every `every` seconds, moved by up to
 * `spread` seconds either way. Event zero is never used, so time zero is always at rest.
 */
export function eventStart(
  seed: string,
  slot: number,
  index: number,
  every: number,
  spread: number,
): number {
  return index * every + (seeded(seed, slot + index * 7) * 2 - 1) * spread;
}
