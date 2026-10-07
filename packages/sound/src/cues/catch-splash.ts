import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit, thump } from '../instruments/percussion';

const LOUDNESS = -21;

/** He lands in the bucket: a thump and a splash that falls away. */
export const catchSplash: Cue = {
  name: 'catch-splash',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([30, 20, 30]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    thump(mix, t, 0.6, 120, 45, 0.3);
    noiseHit(mix, t, { seconds: 0.35, level: 0.2, from: 1200, to: 400, q: 0.8, wet: 0.4 });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
