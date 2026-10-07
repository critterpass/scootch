import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit, thump } from '../instruments/percussion';

const LOUDNESS = -22;

/** A sticker pressed flat into its place: a soft thwap. */
export const catchStick: Cue = {
  name: 'catch-stick',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([24, 30, 12]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    thump(mix, t, 0.5, 180, 60, 0.2);
    noiseHit(mix, t, { seconds: 0.05, level: 0.18, from: 1400, q: 1, wet: 0.2 });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
