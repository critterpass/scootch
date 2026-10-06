import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { note, noteHz } from '../instruments/scale';
import { marimba, voice } from '../instruments/tuned';

const LOUDNESS = -21;

/** "Too big": the monster shrinks. Three marimba notes step down, each smaller, under a little sliding "oh". */
export const shrink: Cue = {
  name: 'shrink',
  loudness: LOUDNESS,
  haptics: [tap(0, 16), tap(90, 11), tap(180, 7)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    [9, 7, 5].forEach((step, i) => {
      marimba(mix, t + i * 0.09, note(step), 0.16 - i * 0.04, i % 2 ? 0.2 : -0.2);
    });
    voice(mix, t + 0.05, noteHz(9), noteHz(5), 0.3, { level: 0.09, vibratoHz: 5 });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
