import { linearPoints } from '../core/envelope';
import { applyBiquad, biquadCoeffs } from '../core/filter';
import { createMix, finishMix, type Mix, place } from '../core/mix';
import { renderTone } from '../core/oscillator';
import { type Cue, tap } from '../cue';
import { noiseHit, shaker, thump } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { bell, marimba } from '../instruments/tuned';

const LOUDNESS = -19;

/** The monster's first grumble: a low, wobbling saw behind a resonant filter. */
function growl(mix: Mix, at: number): void {
  const pitch = linearPoints([
    [0, 92],
    [0.12, 128],
    [0.34, 76],
  ]);
  const raw = renderTone({
    wave: 'sawtooth',
    freq: pitch,
    vibratoHz: 24,
    vibratoDepth: 16,
    attack: 0.02,
    peak: 0.11,
    seconds: 0.36,
  });
  const muffled = applyBiquad(raw, biquadCoeffs('lowpass', 650, 2.24, 0, mix.sampleRate));
  place(mix, muffled, at, { wet: 0.2 });
}

/** A task hatches into a monster: the egg rattles, cracks, notes climb out, and the monster grumbles hello. */
export const hatch: Cue = {
  name: 'hatch',
  loudness: LOUDNESS,
  haptics: [tap(0, 8), tap(90, 8), tap(180, 10), tap(280, 26), tap(560, 14), tap(900, 12)],
  render() {
    const mix = createMix(4);
    const t = 0.012;
    [0, 0.09, 0.18].forEach((offset, i) =>
      shaker(mix, t + offset, 0.04 + i * 0.01, i % 2 ? 0.3 : -0.3),
    );
    noiseHit(mix, t + 0.28, { seconds: 0.05, level: 0.14, from: 2600, q: 2, wet: 0.3 });
    thump(mix, t + 0.28, 0.3, 130, 60, 0.16);
    [0, 2, 4, 7].forEach((step, i) => {
      marimba(mix, t + 0.32 + i * 0.07, note(step), 0.14 + i * 0.02, i % 2 ? 0.25 : -0.25);
    });
    growl(mix, t + 0.56);
    marimba(mix, t + 0.88, note(-5), 0.1);
    bell(mix, t + 0.9, note(12), 0.04, 0.3);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
