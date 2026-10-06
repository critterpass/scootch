const FRAME = 4096;

/** In-place radix-2 FFT of a complex signal held as separate real and imaginary arrays. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] ?? 0, re[i] ?? 0];
      [im[i], im[j]] = [im[j] ?? 0, im[i] ?? 0];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k += 1) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = (re[b] ?? 0) * cos - (im[b] ?? 0) * sin;
        const ti = (re[b] ?? 0) * sin + (im[b] ?? 0) * cos;
        re[b] = (re[a] ?? 0) - tr;
        im[b] = (im[a] ?? 0) - ti;
        re[a] = (re[a] ?? 0) + tr;
        im[a] = (im[a] ?? 0) + ti;
      }
    }
  }
}

/** The average power in each frequency bin over the whole sound (Hann windows, half overlapped). */
export function powerSpectrum(mono: Float32Array): Float64Array {
  const power = new Float64Array(FRAME / 2);
  const frames = Math.max(1, Math.ceil((mono.length - FRAME) / (FRAME / 2)) + 1);
  for (let frame = 0; frame < frames; frame += 1) {
    const re = new Float64Array(FRAME);
    const im = new Float64Array(FRAME);
    for (let i = 0; i < FRAME; i += 1) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME);
      re[i] = (mono[frame * (FRAME / 2) + i] ?? 0) * window;
    }
    fft(re, im);
    for (let bin = 0; bin < power.length; bin += 1) {
      power[bin] = (power[bin] ?? 0) + ((re[bin] ?? 0) ** 2 + (im[bin] ?? 0) ** 2) / frames;
    }
  }
  return power;
}

/** The power-weighted mean frequency in hertz: a rough measure of how bright a sound is. */
export function spectralCentroid(mono: Float32Array, sampleRate: number): number {
  const power = powerSpectrum(mono);
  let weighted = 0;
  let total = 0;
  power.forEach((p, bin) => {
    weighted += p * bin;
    total += p;
  });
  return total === 0 ? 0 : ((weighted / total) * sampleRate) / FRAME;
}

/** The frequency in hertz of the strongest bin at or above `minHz`. */
export function dominantFrequency(mono: Float32Array, sampleRate: number, minHz = 0): number {
  const power = powerSpectrum(mono);
  let best = 0;
  let bestPower = -1;
  power.forEach((p, bin) => {
    if ((bin * sampleRate) / FRAME >= minHz && p > bestPower) {
      best = bin;
      bestPower = p;
    }
  });
  return (best * sampleRate) / FRAME;
}

/**
 * How many octave bands (from 62 Hz up) carry power within `withinDb` of the strongest band:
 * a rough count of how much of the range a mix fills.
 */
export function occupiedOctaves(mono: Float32Array, sampleRate: number, withinDb = 30): number {
  const power = powerSpectrum(mono);
  const bands: number[] = [];
  for (let low = 62.5; low < sampleRate / 2; low *= 2) {
    let sum = 0;
    power.forEach((p, bin) => {
      const hz = (bin * sampleRate) / FRAME;
      if (hz >= low && hz < low * 2) sum += p;
    });
    bands.push(sum);
  }
  const floor = Math.max(...bands) * Math.pow(10, -withinDb / 10);
  return bands.filter((band) => band > 0 && band >= floor).length;
}
