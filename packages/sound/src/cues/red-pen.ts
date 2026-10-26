import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';

const LOUDNESS = -23;

/** His red pen: the short down-stroke of a check and the long stroke up, felt as they are drawn. */
export const redPen: Cue = {
  name: 'red-pen',
  loudness: LOUDNESS,
  haptics: [tap(0, 10), tap(150, 18)],
  render() {
    const mix = createMix(1.3);
    noiseHit(mix, 0.012, {
      seconds: 0.1,
      level: 0.1,
      filter: 'bandpass',
      from: 2400,
      to: 1800,
      q: 1.8,
      wet: 0.1,
    });
    noiseHit(mix, 0.16, {
      seconds: 0.26,
      level: 0.11,
      filter: 'bandpass',
      from: 1800,
      to: 3600,
      q: 1.8,
      wet: 0.1,
    });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
