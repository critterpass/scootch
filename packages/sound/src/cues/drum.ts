import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit, thump } from '../instruments/percussion';

const LOUDNESS = -17;
/** When each of the three strokes lands, in seconds: "Tùng! Tùng! Tùng!". */
const STROKES = [0.012, 0.3, 0.588] as const;

/** The school drum: three deep strokes on a big skin, each a low boom with a slap of hide on top. */
export const drum: Cue = {
  name: 'drum',
  loudness: LOUDNESS,
  haptics: STROKES.map((at) => tap(at * 1000, 60)),
  render() {
    const mix = createMix(2.6);
    STROKES.forEach((at, i) => {
      const last = i === STROKES.length - 1;
      thump(mix, at, last ? 0.8 : 0.7, 120, 52, last ? 0.9 : 0.55);
      noiseHit(mix, at, {
        seconds: 0.06,
        level: 0.12,
        filter: 'lowpass',
        from: 900,
        q: 0.8,
        wet: 0.4,
      });
      noiseHit(mix, at, { seconds: 0.03, level: 0.05, from: 2200, q: 1.4, wet: 0.2 });
    });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
