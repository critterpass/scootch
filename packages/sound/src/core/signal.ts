/** Shared PCM types and helpers. Everything renders 32-bit float samples at this rate. */
export const SAMPLE_RATE = 44100;

/** Rendered audio. Mono sounds are a `Float32Array`; finished cues and tracks are stereo. */
export interface Stereo {
  readonly sampleRate: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export function secondsToSamples(seconds: number, sampleRate = SAMPLE_RATE): number {
  return Math.max(0, Math.round(seconds * sampleRate));
}

export function durationSeconds(audio: Stereo): number {
  return audio.left.length / audio.sampleRate;
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/** Silence maps to a very low floor instead of -Infinity. */
export function linearToDb(linear: number): number {
  return 20 * Math.log10(Math.max(Math.abs(linear), 1e-12));
}

/** Largest absolute sample across both channels. */
export function peak(audio: Stereo): number {
  let max = 0;
  for (const channel of [audio.left, audio.right]) {
    for (const value of channel) {
      const abs = Math.abs(value);
      if (abs > max) max = abs;
    }
  }
  return max;
}

/** Root mean square of both channels between two times, in decibels relative to full scale. */
export function rmsDb(audio: Stereo, fromSeconds = 0, toSeconds = Infinity): number {
  const from = Math.max(0, secondsToSamples(fromSeconds, audio.sampleRate));
  const to = Math.min(audio.left.length, Math.round(toSeconds * audio.sampleRate));
  if (to <= from) return linearToDb(0);
  let sum = 0;
  for (let i = from; i < to; i += 1) {
    const l = audio.left[i] ?? 0;
    const r = audio.right[i] ?? 0;
    sum += l * l + r * r;
  }
  return linearToDb(Math.sqrt(sum / (2 * (to - from))));
}

/** The mono fold-down, for measuring. */
export function toMono(audio: Stereo): Float32Array {
  const out = new Float32Array(audio.left.length);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = ((audio.left[i] ?? 0) + (audio.right[i] ?? 0)) / 2;
  }
  return out;
}

export function scaled(audio: Stereo, gain: number): Stereo {
  return {
    sampleRate: audio.sampleRate,
    left: audio.left.map((v) => v * gain),
    right: audio.right.map((v) => v * gain),
  };
}

/** Raised-cosine fades at the edges, in place. The last sample of a fade-out is exactly zero. */
export function fadeEdges(audio: Stereo, fadeInSeconds: number, fadeOutSeconds: number): void {
  const length = audio.left.length;
  const fadeIn = Math.min(length, secondsToSamples(fadeInSeconds, audio.sampleRate));
  const fadeOut = Math.min(length, secondsToSamples(fadeOutSeconds, audio.sampleRate));
  for (const channel of [audio.left, audio.right]) {
    for (let i = 0; i < fadeIn; i += 1) {
      channel[i] = (channel[i] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / fadeIn));
    }
    for (let i = 0; i < fadeOut; i += 1) {
      const index = length - 1 - i;
      channel[index] = (channel[index] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / fadeOut));
    }
  }
}
