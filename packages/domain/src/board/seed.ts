/**
 * Seeded chance. Every surprise on the board (a happening, a carving, the circled 10) is worked
 * out from a seed, so the same finish always gives the same thing and a test can name it.
 */

/** FNV-1a over the seed's UTF-16 units, then a 32-bit avalanche. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

/** A number in [0, 1) fixed by the seed and what it is rolled for. */
export function roll(seed: string, purpose: string): number {
  return hash(`${purpose}\u0000${seed}`) / 0x1_0000_0000;
}

/** True about one time in `oneIn`, the same every time for the same seed. */
export function oneIn(oneIn: number, seed: string, purpose: string): boolean {
  return roll(seed, purpose) < 1 / oneIn;
}

/** One of `options`, chosen by the seed. */
export function choose<T>(options: readonly T[], seed: string, purpose: string): T {
  const chosen = options[Math.floor(roll(seed, purpose) * options.length)];
  if (chosen === undefined) throw new Error('choose needs at least one option');
  return chosen;
}
