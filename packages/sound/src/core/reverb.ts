import { applyBiquad, biquadCoeffs } from './filter';
import { SAMPLE_RATE } from './signal';

/** Comb and allpass delay lengths in samples at 44.1 kHz (the Freeverb tuning). */
const COMB_DELAYS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_DELAYS = [556, 441, 341, 225];
/** Extra delay on the right channel, so the two sides decorrelate into a room. */
const STEREO_SPREAD = 23;
const DECAY_SECONDS = 2.2;
const PRE_DELAY_SECONDS = 0.02;
const TONE_HZ = 5200;
/** Energy the room returns for a steady input, matched to the design's two-second noise room. */
const ROOM_ENERGY = 0.15;

function reverbChannel(input: Float32Array, spread: number, sampleRate: number): Float32Array {
  const scale = sampleRate / 44100;
  const out = new Float32Array(input.length);
  for (const base of COMB_DELAYS) {
    const delay = Math.round((base + spread) * scale);
    const feedback = Math.pow(10, (-3 * delay) / (DECAY_SECONDS * sampleRate));
    const line = new Float32Array(delay);
    let index = 0;
    let damped = 0;
    for (let i = 0; i < input.length; i += 1) {
      const echo = line[index] ?? 0;
      damped = echo * 0.8 + damped * 0.2;
      line[index] = (input[i] ?? 0) + damped * feedback;
      index = (index + 1) % delay;
      out[i] = (out[i] ?? 0) + echo;
    }
  }
  for (const base of ALLPASS_DELAYS) {
    const delay = Math.round((base + spread) * scale);
    const line = new Float32Array(delay);
    let index = 0;
    for (let i = 0; i < out.length; i += 1) {
      const x = out[i] ?? 0;
      const held = line[index] ?? 0;
      out[i] = held - 0.5 * x;
      line[index] = x + 0.5 * held;
      index = (index + 1) % delay;
    }
  }
  return out;
}

const calibration = new Map<number, number>();

/** The gain that brings the raw room to `ROOM_ENERGY`, measured once from its impulse response. */
function roomGain(sampleRate: number): number {
  const known = calibration.get(sampleRate);
  if (known !== undefined) return known;
  const impulse = new Float32Array(Math.round(sampleRate * 3));
  impulse[0] = 1;
  let energy = 0;
  for (const value of reverbChannel(impulse, 0, sampleRate)) energy += value * value;
  const gain = Math.sqrt(ROOM_ENERGY / energy);
  calibration.set(sampleRate, gain);
  return gain;
}

/**
 * One shared room for every sound: a short pre-delay, a two-second decaying tail and a soft top.
 * Takes the mono send and returns only the wet signal, the same length as the input.
 */
export function roomReverb(
  send: Float32Array,
  sampleRate = SAMPLE_RATE,
): { left: Float32Array; right: Float32Array } {
  const preDelay = Math.round(PRE_DELAY_SECONDS * sampleRate);
  const delayed = new Float32Array(send.length);
  delayed.set(send.subarray(0, Math.max(0, send.length - preDelay)), preDelay);
  const gain = roomGain(sampleRate);
  const tone = biquadCoeffs('lowpass', TONE_HZ, 0.8, 0, sampleRate);
  const shape = (wet: Float32Array) => applyBiquad(wet, tone, sampleRate).map((v) => v * gain);
  return {
    left: shape(reverbChannel(delayed, 0, sampleRate)),
    right: shape(reverbChannel(delayed, STEREO_SPREAD, sampleRate)),
  };
}
