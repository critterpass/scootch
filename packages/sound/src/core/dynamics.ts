import { dbToLinear, linearToDb, type Stereo } from './signal';

export interface CompressorOptions {
  readonly thresholdDb: number;
  /** Width of the soft knee above the threshold, in decibels. */
  readonly kneeDb: number;
  readonly ratio: number;
  readonly attackSeconds: number;
  readonly releaseSeconds: number;
}

/** Output level for an input level, both in decibels: unity below the threshold, a soft knee, then the ratio. */
function compressedDb(inputDb: number, options: CompressorOptions): number {
  const { thresholdDb, kneeDb, ratio } = options;
  const over = inputDb - thresholdDb;
  if (over <= 0) return inputDb;
  const slope = 1 / ratio - 1;
  if (over <= kneeDb) return inputDb + (slope * over * over) / (2 * kneeDb);
  return inputDb + (slope * kneeDb) / 2 + slope * (over - kneeDb);
}

/**
 * A gentle bus compressor, in place. Both channels follow one detector so the image never shifts.
 * It only ever turns the signal down.
 */
export function compress(audio: Stereo, options: CompressorOptions): void {
  const attack = Math.exp(-1 / (Math.max(options.attackSeconds, 1e-4) * audio.sampleRate));
  const release = Math.exp(-1 / (Math.max(options.releaseSeconds, 1e-4) * audio.sampleRate));
  let level = 0;
  for (let i = 0; i < audio.left.length; i += 1) {
    const l = audio.left[i] ?? 0;
    const r = audio.right[i] ?? 0;
    const input = Math.max(Math.abs(l), Math.abs(r));
    const coeff = input > level ? attack : release;
    level = coeff * level + (1 - coeff) * input;
    const levelDb = linearToDb(level);
    const gain = dbToLinear(compressedDb(levelDb, options) - levelDb);
    audio.left[i] = l * gain;
    audio.right[i] = r * gain;
  }
}
