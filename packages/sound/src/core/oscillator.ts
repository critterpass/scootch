import { strike } from './envelope';
import { SAMPLE_RATE } from './signal';

export type Wave = 'sine' | 'triangle' | 'sawtooth';

const TWO_PI = 2 * Math.PI;

/** One sample of a waveform at `phase` radians, each with a peak of 1. */
export function waveAt(wave: Wave, phase: number): number {
  if (wave === 'sine') return Math.sin(phase);
  const cycle = phase / TWO_PI - Math.floor(phase / TWO_PI);
  if (wave === 'sawtooth') return 2 * cycle - 1;
  return cycle < 0.25 ? 4 * cycle : cycle < 0.75 ? 2 - 4 * cycle : 4 * cycle - 4;
}

export interface ToneOptions {
  readonly wave: Wave;
  /** Hertz, fixed or as a function of seconds since the note began. */
  readonly freq: number | ((t: number) => number);
  /** Seconds from the start to the end of the envelope. */
  readonly seconds: number;
  readonly attack: number;
  readonly peak: number;
  readonly detuneCents?: number;
  readonly vibratoHz?: number;
  /** Vibrato depth in hertz. */
  readonly vibratoDepth?: number;
}

/** One enveloped oscillator note as mono samples. Partials above the usable band are left out. */
export function renderTone(options: ToneOptions, sampleRate = SAMPLE_RATE): Float32Array {
  const { wave, freq, seconds, attack, peak } = options;
  const out = new Float32Array(Math.max(0, Math.ceil(seconds * sampleRate)));
  const detune = Math.pow(2, (options.detuneCents ?? 0) / 1200);
  const freqAt = typeof freq === 'number' ? () => freq : freq;
  if (freqAt(0) * detune > sampleRate * 0.45) return out;
  const vibratoHz = options.vibratoHz ?? 0;
  const vibratoDepth = options.vibratoDepth ?? 0;
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / sampleRate;
    out[i] = waveAt(wave, phase) * strike(t, attack, peak, seconds);
    const wobble = vibratoDepth ? Math.sin(TWO_PI * vibratoHz * t) * vibratoDepth : 0;
    phase += (TWO_PI * (freqAt(t) * detune + wobble)) / sampleRate;
  }
  return out;
}

/** MIDI note number to hertz. */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
