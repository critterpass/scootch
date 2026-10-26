import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';

const LOUDNESS = -24;

/** Chalk on the board: two quick dry scratches, the second a little higher. */
export const chalk: Cue = {
  name: 'chalk',
  loudness: LOUDNESS,
  haptics: [tap(0, 8), tap(120, 8)],
  render() {
    const mix = createMix(1.2);
    noiseHit(mix, 0.012, {
      seconds: 0.09,
      level: 0.12,
      filter: 'bandpass',
      from: 3200,
      to: 4200,
      q: 2.5,
      wet: 0.1,
    });
    noiseHit(mix, 0.13, {
      seconds: 0.07,
      level: 0.1,
      filter: 'bandpass',
      from: 3800,
      to: 5200,
      q: 2.5,
      wet: 0.1,
    });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
