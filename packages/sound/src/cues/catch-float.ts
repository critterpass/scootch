import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { bell } from '../instruments/tuned';

const LOUDNESS = -25;

/** A bubble lifts off and drifts: a long soft breath of air with two small bells. */
export const catchFloat: Cue = {
  name: 'catch-float',
  loudness: LOUDNESS,
  haptics: [tap(0, 14)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.6, level: 0.1, from: 500, to: 4000, q: 1, wet: 0.5 });
    bell(mix, t + 0.1, note(14), 0.05);
    bell(mix, t + 0.3, note(16), 0.04);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
