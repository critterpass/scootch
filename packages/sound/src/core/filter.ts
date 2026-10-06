import { SAMPLE_RATE } from './signal';

export type BiquadType = 'lowpass' | 'highpass' | 'bandpass' | 'peaking' | 'lowshelf' | 'highshelf';

export interface BiquadCoeffs {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

/** Biquad coefficients from the RBJ audio EQ cookbook, normalised so `a0 = 1`. */
export function biquadCoeffs(
  type: BiquadType,
  freqHz: number,
  q: number,
  gainDb = 0,
  sampleRate = SAMPLE_RATE,
): BiquadCoeffs {
  const w0 = (2 * Math.PI * Math.min(freqHz, sampleRate * 0.45)) / sampleRate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Math.max(q, 1e-6));
  const a = Math.pow(10, gainDb / 40);
  const shelf = 2 * Math.sqrt(a) * alpha;
  let b: [number, number, number];
  let den: [number, number, number];
  switch (type) {
    case 'lowpass':
      b = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      den = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'highpass':
      b = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      den = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'bandpass':
      b = [alpha, 0, -alpha];
      den = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'peaking':
      b = [1 + alpha * a, -2 * cos, 1 - alpha * a];
      den = [1 + alpha / a, -2 * cos, 1 - alpha / a];
      break;
    case 'lowshelf':
      b = [
        a * (a + 1 - (a - 1) * cos + shelf),
        2 * a * (a - 1 - (a + 1) * cos),
        a * (a + 1 - (a - 1) * cos - shelf),
      ];
      den = [
        a + 1 + (a - 1) * cos + shelf,
        -2 * (a - 1 + (a + 1) * cos),
        a + 1 + (a - 1) * cos - shelf,
      ];
      break;
    case 'highshelf':
      b = [
        a * (a + 1 + (a - 1) * cos + shelf),
        -2 * a * (a - 1 + (a + 1) * cos),
        a * (a + 1 + (a - 1) * cos - shelf),
      ];
      den = [
        a + 1 - (a - 1) * cos + shelf,
        2 * (a - 1 - (a + 1) * cos),
        a + 1 - (a - 1) * cos - shelf,
      ];
      break;
  }
  const a0 = den[0];
  return { b0: b[0] / a0, b1: b[1] / a0, b2: b[2] / a0, a1: den[1] / a0, a2: den[2] / a0 };
}

/** How often a moving filter recomputes its coefficients, in samples. */
const SWEEP_BLOCK = 32;

/**
 * Filters a mono buffer into a new one. `coeffsAt`, when given a function of seconds, lets the
 * filter move while it runs (a sweep); a fixed set of coefficients gives a still filter.
 */
export function applyBiquad(
  input: Float32Array,
  coeffsAt: BiquadCoeffs | ((t: number) => BiquadCoeffs),
  sampleRate = SAMPLE_RATE,
): Float32Array {
  const out = new Float32Array(input.length);
  let c = typeof coeffsAt === 'function' ? coeffsAt(0) : coeffsAt;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    if (typeof coeffsAt === 'function' && i % SWEEP_BLOCK === 0) c = coeffsAt(i / sampleRate);
    const x = input[i] ?? 0;
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}
