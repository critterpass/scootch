import { expGlide } from '../core/envelope';
import { applyBiquad, biquadCoeffs } from '../core/filter';
import { type Mix, place } from '../core/mix';
import { midiToHz, renderTone, type Wave } from '../core/oscillator';

import { noiseHit } from './percussion';

/** A wooden mallet note: three sine partials that start a touch sharp, and a click. */
export function marimba(
  mix: Mix,
  at: number,
  midi: number,
  level = 0.25,
  pan = 0,
  wet = 0.45,
): void {
  const hz = midiToHz(midi);
  const length = 1 + (72 - midi) / 40;
  const partials = [
    [1, 1, 0.7],
    [3.99, 0.32, 0.16],
    [9.8, 0.07, 0.05],
  ] as const;
  for (const [multiple, amount, decay] of partials) {
    const tone = renderTone(
      {
        wave: 'sine',
        freq: expGlide(hz * multiple * 1.006, hz * multiple, 0.025),
        attack: 0.003,
        peak: level * amount,
        seconds: 0.003 + decay * length,
      },
      mix.sampleRate,
    );
    place(mix, tone, at, { pan, wet });
  }
  noiseHit(mix, at, { seconds: 0.012, level: level * 0.18, from: 3800, q: 2, pan, wet: 0 });
}

/** A small bell: four inharmonic sine partials, mostly room. */
export function bell(mix: Mix, at: number, midi: number, level = 0.08, pan = 0, wet = 0.9): void {
  const hz = midiToHz(midi);
  const partials = [
    [1, 1, 1.8],
    [2.76, 0.38, 0.9],
    [5.4, 0.18, 0.4],
    [8.93, 0.07, 0.2],
  ] as const;
  for (const [multiple, amount, decay] of partials) {
    const tone = renderTone(
      {
        wave: 'sine',
        freq: hz * multiple,
        attack: 0.002,
        peak: level * amount,
        seconds: 0.002 + decay,
      },
      mix.sampleRate,
    );
    place(mix, tone, at, { pan, wet });
  }
}

/** A soft chord: each note is two detuned triangles, spread left and right, swelling in turn. */
export function pad(
  mix: Mix,
  at: number,
  midis: readonly number[],
  seconds: number,
  level = 0.04,
  wet = 1.1,
): void {
  midis.forEach((midi, i) => {
    for (const cents of [-5, 5]) {
      const tone = renderTone(
        {
          wave: 'triangle',
          freq: midiToHz(midi),
          detuneCents: cents,
          attack: 0.09 + i * 0.02,
          peak: level,
          seconds,
        },
        mix.sampleRate,
      );
      place(mix, tone, at, { pan: cents / 10, wet });
    }
  });
}

export interface VoiceOptions {
  readonly level?: number;
  readonly vibratoHz?: number;
  readonly wave?: Wave;
  readonly pan?: number;
}

/** Scootch's voice: a gliding note with vibrato, a nasal peak and a rounded top. */
export function voice(
  mix: Mix,
  at: number,
  fromHz: number,
  toHz: number,
  seconds: number,
  options: VoiceOptions = {},
): void {
  const { level = 0.15, vibratoHz = 6, wave = 'triangle', pan = 0 } = options;
  const { sampleRate } = mix;
  const raw = renderTone(
    {
      wave,
      freq: expGlide(fromHz, toHz, seconds * 0.75),
      vibratoHz,
      vibratoDepth: vibratoHz ? fromHz * 0.022 : 0,
      attack: 0.014,
      peak: level,
      seconds: 0.014 + seconds,
    },
    sampleRate,
  );
  const nasal = applyBiquad(raw, biquadCoeffs('peaking', 900, 2, 8, sampleRate), sampleRate);
  const rounded = applyBiquad(nasal, biquadCoeffs('lowpass', 2800, 0.8, 0, sampleRate), sampleRate);
  place(mix, rounded, at, { pan, wet: 0.35 });
}
