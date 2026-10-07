import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { noteHz } from '../instruments/scale';
import { voice } from '../instruments/tuned';

const LOUDNESS = -21;

/** The line goes tight and he is pulled clear: a rising whoosh with Scootch's hup over it. */
export const catchYank: Cue = {
  name: 'catch-yank',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([20, 30, 40]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.3, level: 0.2, from: 500, to: 5000, q: 1 });
    voice(mix, t, noteHz(7), noteHz(12), 0.25, { level: 0.13 });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
