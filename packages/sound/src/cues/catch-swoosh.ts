import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';

const LOUDNESS = -24;

/** Something swung through the air: a whoosh that opens upward. */
export const catchSwoosh: Cue = {
  name: 'catch-swoosh',
  loudness: LOUDNESS,
  haptics: [tap(0, 10)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.25, level: 0.2, from: 700, to: 4500, q: 1 });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
