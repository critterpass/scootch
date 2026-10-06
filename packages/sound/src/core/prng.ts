/** Deterministic randomness: the same seed always gives the same sequence, so renders repeat exactly. */
export type Rng = () => number;

/** FNV-1a string hash, folded into a 32-bit unsigned seed. */
export function seedFromString(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32. */
export function createRng(seed: number | string): Rng {
  let state = typeof seed === 'string' ? seedFromString(seed) : seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform integer in `[0, count)`. */
export function rngIndex(rng: Rng, count: number): number {
  return Math.min(count - 1, Math.floor(rng() * count));
}

/** One item of a non-empty list. */
export function rngPick<T>(rng: Rng, items: readonly [T, ...T[]]): T {
  return items[rngIndex(rng, items.length)] ?? items[0];
}
