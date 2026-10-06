import type { Stereo } from './core/signal';

/** One tap of a haptic pattern, for the app to play in step with the sound. */
export interface HapticTap {
  /** Milliseconds from the start of the cue. */
  readonly atMs: number;
  readonly durationMs: number;
  /** 0 (barely felt) to 1 (strongest). */
  readonly intensity: number;
  /** 0 (a soft thud) to 1 (a crisp tick). */
  readonly sharpness: number;
}

/** A named sound with its matching haptics. Rendering is pure: the same cue always gives the same samples. */
export interface Cue {
  readonly name: string;
  /** The integrated loudness the cue aims for, in LUFS. A cue with a hard peak lands a little under it. */
  readonly loudness: number;
  readonly haptics: readonly HapticTap[];
  render(): Stereo;
}

/** Every cue sits inside this loudness band (LUFS), so none is startlingly louder than another. */
export const CUE_LOUDNESS_BAND = { min: -28, max: -16 } as const;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** A tap whose strength and softness follow its length: long buzzes are strong and dull, short ones light and crisp. */
export function tap(atMs: number, durationMs: number): HapticTap {
  return {
    atMs: Math.round(atMs),
    durationMs: Math.round(durationMs),
    intensity: Number(clamp(0.25 + durationMs / 80).toFixed(2)),
    sharpness: Number(clamp(1 - durationMs / 120).toFixed(2)),
  };
}

/** Taps from a buzz pattern written as alternating on and off times in milliseconds. */
export function tapsFromBuzzes(pattern: readonly number[]): HapticTap[] {
  const taps: HapticTap[] = [];
  let at = 0;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) taps.push(tap(at, ms));
    at += ms;
  });
  return taps;
}

export function isCue(value: unknown): value is Cue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Cue).name === 'string' &&
    typeof (value as Cue).render === 'function' &&
    Array.isArray((value as Cue).haptics)
  );
}
