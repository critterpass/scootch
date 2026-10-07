import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit, thump } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -20;

/** Something heavy comes down over the monster: a low drum, a puff of dust and one deep marimba note. */
export const catchSlam: Cue = {
  name: 'catch-slam',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([30, 30, 20]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    thump(mix, t, 0.85, 150, 40, 0.45);
    noiseHit(mix, t, {
      seconds: 0.25,
      level: 0.22,
      filter: 'lowpass',
      from: 3000,
      to: 300,
      q: 0.7,
    });
    marimba(mix, t + 0.02, note(0), 0.12);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
