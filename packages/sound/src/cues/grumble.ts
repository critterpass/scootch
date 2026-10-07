import { linearPoints } from '../core/envelope';
import { applyBiquad, biquadCoeffs } from '../core/filter';
import { createMix, finishMix, place } from '../core/mix';
import { renderTone } from '../core/oscillator';
import { type Cue, tap } from '../cue';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -21;
const GROWL_SECONDS = 0.34;

/**
 * A monster grumbles when tapped: a low buzzing growl that swells and sags, wobbling fast behind a
 * ringing low-pass, then one marimba note an octave under the root.
 */
export const grumble: Cue = {
  name: 'grumble',
  loudness: LOUDNESS,
  haptics: [tap(0, 14)],
  render() {
    const mix = createMix(3.5);
    const { sampleRate } = mix;
    const t = 0.012;
    const growl = renderTone(
      {
        wave: 'sawtooth',
        freq: linearPoints([
          [0, 92],
          [0.12, 128],
          [GROWL_SECONDS, 76],
        ]),
        vibratoHz: 24,
        vibratoDepth: 16,
        attack: 0.02,
        peak: 0.11,
        seconds: 0.02 + GROWL_SECONDS,
      },
      sampleRate,
    );
    const muffled = applyBiquad(growl, biquadCoeffs('lowpass', 650, 7, 0, sampleRate), sampleRate);
    place(mix, muffled, t, { wet: 0.2 });
    marimba(mix, t + 0.32, note(-5), 0.1);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
