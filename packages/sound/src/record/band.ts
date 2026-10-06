import { expGlide } from '../core/envelope';
import { applyBiquad, biquadCoeffs } from '../core/filter';
import { type Mix, place } from '../core/mix';
import { whiteNoise } from '../core/noise';
import { midiToHz, renderTone, type Wave } from '../core/oscillator';
import { KEY_ROOT, PENTATONIC } from '../instruments/scale';

import { type Bar, type BarNote, DRUM, type RecordInstrument, STEPS_PER_BAR } from './bar';

export const STEP_SECONDS = 0.11;
export const BAR_SECONDS = STEP_SECONDS * STEPS_PER_BAR;

/** A chord as semitones above the key's root. */
export type Chord = readonly [number, number, number];
export const CHORDS = {
  one: [0, 4, 7],
  four: [5, 9, 12],
  five: [7, 11, 14],
  six: [9, 12, 16],
} as const satisfies Record<string, Chord>;

/** The record's bus: every part sits in the middle, with a share sent to the room. */
const BUS = { gain: 0.9, wet: 0.35 } as const;

interface LineOptions {
  readonly glideTo?: number;
  readonly vibrato?: boolean;
  readonly detuneCents?: number;
  readonly attack?: number;
}

/** One plain enveloped note on the record's bus. */
function line(
  mix: Mix,
  at: number,
  hz: number,
  seconds: number,
  wave: Wave,
  level: number,
  options: LineOptions = {},
): void {
  const { glideTo, vibrato = false, detuneCents = 0, attack = 0.01 } = options;
  const tone = renderTone(
    {
      wave,
      freq: glideTo === undefined ? hz : expGlide(hz, glideTo, seconds * 0.7),
      detuneCents,
      vibratoHz: 5.5,
      vibratoDepth: vibrato ? hz * 0.012 : 0,
      attack,
      peak: level,
      seconds,
    },
    mix.sampleRate,
  );
  place(mix, tone, at, BUS);
}

/** A hit of band-passed noise that falls away quickly: snares, hats and the final crash. */
function hiss(mix: Mix, at: number, seconds: number, level: number, hz: number, q: number): void {
  mix.noiseCount += 1;
  const length = Math.floor(seconds * mix.sampleRate);
  const raw = whiteNoise(length, mix.noiseCount);
  for (let i = 0; i < length; i += 1) raw[i] = (raw[i] ?? 0) * Math.pow(1 - i / length, 2) * level;
  place(mix, applyBiquad(raw, biquadCoeffs('bandpass', hz, q, 0, mix.sampleRate)), at, BUS);
}

const key = (semitones: number) => midiToHz(KEY_ROOT + semitones);

type Player = (mix: Mix, at: number, note: BarNote, chord: Chord, untilNext: number) => void;

const PLAYERS: Record<RecordInstrument, Player> = {
  keys(mix, at, note, chord) {
    chord.forEach((tone, i) => {
      line(mix, at, key(tone + (i < note.part ? 12 : 0)), 0.32, 'triangle', 0.035);
    });
  },
  bassline(mix, at, note, chord) {
    line(mix, at, key(chord[0] - 24 + ([0, 7, 12][note.part] ?? 0)), 0.26, 'sine', 0.2);
  },
  marimba(mix, at, note, chord) {
    line(mix, at, key(12 + (chord[note.part] ?? 0)), 0.16, 'sine', 0.07);
  },
  drums(mix, at, note) {
    if (note.part === DRUM.kick) line(mix, at, 150, 0.16, 'sine', 0.35, { glideTo: 40 });
    else if (note.part === DRUM.snare) hiss(mix, at, 0.14, 0.5, 1800, 0.8);
    else hiss(mix, at, 0.03, 0.12, 8000, 1.2);
  },
  // The whistle stays on the key's own scale whatever the chord, so it never leaves the key.
  whistle(mix, at, note) {
    line(mix, at, key(24 + (PENTATONIC[note.part] ?? 0)), 0.34, 'sine', 0.05, {
      vibrato: true,
      attack: 0.04,
    });
  },
  bells(mix, at, note, chord) {
    const hz = key(36 + ((chord[note.part] ?? 0) % 12));
    line(mix, at, hz, 1.3, 'sine', 0.03);
    line(mix, at, hz, 1.3, 'sine', 0.02, { detuneCents: 7 });
  },
  choir(mix, at, note, chord, untilNext) {
    const voicings: readonly (readonly number[])[] = [
      chord,
      [...chord, chord[0] + 12],
      [chord[0], chord[2], chord[1] + 12],
    ];
    for (const tone of voicings[note.part] ?? chord) {
      for (const detuneCents of [-6, 6]) {
        line(mix, at, key(tone), untilNext * 0.98, 'triangle', 0.018, {
          attack: 0.35,
          detuneCents,
        });
      }
    }
  },
};

/** Plays one day's bar over `chord`, starting at `at` seconds. */
export function playBar(mix: Mix, bar: Bar, chord: Chord, at: number): void {
  const play = PLAYERS[bar.instrument];
  const steps = bar.notes.map((note) => note.step);
  for (const note of bar.notes) {
    const next = Math.min(STEPS_PER_BAR, ...steps.filter((step) => step > note.step));
    play(mix, at + note.step * STEP_SECONDS, note, chord, (next - note.step) * STEP_SECONDS);
  }
}

export const ENDING_SECONDS = 2.2;

/** The last chord, played by whoever is in the band: it always lands on the key's home chord. */
export function playEnding(mix: Mix, band: readonly RecordInstrument[], at: number): void {
  for (const tone of [0, 4, 7, 12]) line(mix, at, key(tone), ENDING_SECONDS, 'triangle', 0.05);
  if (band.includes('bassline') || band.length >= 3) {
    line(mix, at, key(-24), ENDING_SECONDS, 'sine', 0.2);
  }
  if (band.includes('drums')) hiss(mix, at, 0.5, 0.3, 3000, 0.5);
  if (band.includes('bells')) line(mix, at, key(36), 1.3, 'sine', 0.03);
}
