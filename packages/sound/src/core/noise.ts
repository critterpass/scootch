import { createRng } from './prng';
import { SAMPLE_RATE } from './signal';

let table: Float32Array | undefined;

/** Two seconds of white noise, the same every run. */
function noiseTable(): Float32Array {
  if (table) return table;
  const rng = createRng('scootch-noise');
  table = new Float32Array(SAMPLE_RATE * 2);
  for (let i = 0; i < table.length; i += 1) table[i] = rng() * 2 - 1;
  return table;
}

/**
 * `length` samples of white noise. `variant` picks where in the shared table to start, so two hits
 * with different variants do not sound like copies of each other, and the same variant repeats exactly.
 */
export function whiteNoise(length: number, variant = 0): Float32Array {
  const source = noiseTable();
  const start = (Math.abs(Math.round(variant)) * 104729) % source.length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = source[(start + i) % source.length] ?? 0;
  return out;
}
