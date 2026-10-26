import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';

const LOUDNESS = -26;

/** His tea: a short slurp that rises, and a contented breath out. A faint touch with the sip. */
export const teaSip: Cue = {
  name: 'tea-sip',
  loudness: LOUDNESS,
  haptics: [tap(0, 6)],
  render() {
    const mix = createMix(1.4);
    noiseHit(mix, 0.012, {
      seconds: 0.22,
      level: 0.1,
      filter: 'bandpass',
      from: 600,
      to: 1800,
      q: 3,
      wet: 0.15,
    });
    noiseHit(mix, 0.42, {
      seconds: 0.35,
      level: 0.05,
      filter: 'lowpass',
      from: 900,
      to: 400,
      q: 0.7,
      wet: 0.2,
    });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
