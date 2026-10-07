import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -25;

/** A paper flap folded down: a soft crease and a marimba note. */
export const catchFold: Cue = {
  name: 'catch-fold',
  loudness: LOUDNESS,
  haptics: [tap(0, 10)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.12, level: 0.14, from: 2200, to: 900, q: 0.8, wet: 0.2 });
    marimba(mix, t + 0.03, note(6), 0.1);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
