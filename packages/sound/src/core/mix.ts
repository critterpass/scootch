import { compress } from './dynamics';
import { applyBiquad, biquadCoeffs } from './filter';
import { normalise } from './loudness';
import { roomReverb } from './reverb';
import { fadeEdges, SAMPLE_RATE, secondsToSamples, type Stereo } from './signal';

/** A mixing desk being filled: the dry stereo bus and the mono send into the shared room. */
export interface Mix {
  readonly sampleRate: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly send: Float32Array;
  /** Counts noise hits, so each one reads a different, repeatable stretch of noise. */
  noiseCount: number;
}

export function createMix(seconds: number, sampleRate = SAMPLE_RATE): Mix {
  const length = secondsToSamples(seconds, sampleRate);
  return {
    sampleRate,
    left: new Float32Array(length),
    right: new Float32Array(length),
    send: new Float32Array(length),
    noiseCount: 0,
  };
}

export interface Placement {
  /** -1 (left) to 1 (right), equal power. */
  readonly pan?: number;
  /** How much of the sound also goes to the room. */
  readonly wet?: number;
  readonly gain?: number;
}

/** Adds a mono sound to the mix at `atSeconds`. Anything past the end of the mix is dropped. */
export function place(
  mix: Mix,
  mono: Float32Array,
  atSeconds: number,
  placement: Placement = {},
): void {
  const { pan = 0, wet = 0, gain = 1 } = placement;
  const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  const leftGain = Math.cos(angle) * gain;
  const rightGain = Math.sin(angle) * gain;
  const sendGain = wet * gain;
  const offset = secondsToSamples(atSeconds, mix.sampleRate);
  const end = Math.min(mono.length, mix.left.length - offset);
  for (let i = 0; i < end; i += 1) {
    const value = mono[i] ?? 0;
    const j = offset + i;
    mix.left[j] = (mix.left[j] ?? 0) + value * leftGain;
    mix.right[j] = (mix.right[j] ?? 0) + value * rightGain;
    if (sendGain) mix.send[j] = (mix.send[j] ?? 0) + value * sendGain;
  }
}

/** The level of the room's input and of the whole bus, as in the design's signal chain. */
const ROOM_SEND = 0.3;
const BUS_GAIN = 0.85;
/** Trailing samples quieter than this (80 dB down) are cut. */
const SILENCE = 0.0001;
const TAIL_FADE_SECONDS = 0.03;
/** One decibel under full scale. */
export const PEAK_CEILING = 0.89;

export interface FinishOptions {
  /** Integrated loudness to bring the result to, in LUFS. */
  readonly loudness?: number;
  /** A fixed gain instead, for sounds whose level must follow something else. */
  readonly gain?: number;
  /** Keep the full length instead of cutting trailing silence. */
  readonly keepLength?: boolean;
}

/**
 * Turns a filled mix into finished audio: the room, a little warmth and a softened top, gentle bus
 * compression, trailing silence cut with a short fade, then the level set under the peak ceiling.
 */
export function finishMix(mix: Mix, options: FinishOptions = {}): Stereo {
  const { sampleRate } = mix;
  const room = roomReverb(mix.send, sampleRate);
  const warm = biquadCoeffs('lowshelf', 200, 0.707, 2.5, sampleRate);
  const air = biquadCoeffs('highshelf', 7000, 0.707, -4, sampleRate);
  const bus = (dry: Float32Array, wet: Float32Array) => {
    const summed = dry.map((v, i) => (v + (wet[i] ?? 0) * ROOM_SEND) * BUS_GAIN);
    return applyBiquad(applyBiquad(summed, warm, sampleRate), air, sampleRate);
  };
  const full = { sampleRate, left: bus(mix.left, room.left), right: bus(mix.right, room.right) };
  compress(full, {
    thresholdDb: -16,
    kneeDb: 14,
    ratio: 3.2,
    attackSeconds: 0.003,
    releaseSeconds: 0.22,
  });

  let length = full.left.length;
  if (!options.keepLength) {
    while (
      length > 0 &&
      Math.abs(full.left[length - 1] ?? 0) < SILENCE &&
      Math.abs(full.right[length - 1] ?? 0) < SILENCE
    ) {
      length -= 1;
    }
  }
  const cut: Stereo = {
    sampleRate,
    left: full.left.slice(0, length),
    right: full.right.slice(0, length),
  };
  fadeEdges(cut, 0, TAIL_FADE_SECONDS);
  if (options.gain !== undefined) {
    return {
      sampleRate,
      left: cut.left.map((v) => v * (options.gain ?? 1)),
      right: cut.right.map((v) => v * (options.gain ?? 1)),
    };
  }
  return options.loudness === undefined ? cut : normalise(cut, options.loudness, PEAK_CEILING);
}
