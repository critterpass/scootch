import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit, thump } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -22;

/** A thought goes into the drawer: a soft slide, two notes stepping down, and the drawer closing. */
export const parkAThought: Cue = {
  name: 'park-a-thought',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([6, 40, 10, 180, 18]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.24, level: 0.09, from: 3600, to: 500, q: 1, wet: 0.35 });
    marimba(mix, t + 0.05, note(7), 0.11, 0.2);
    marimba(mix, t + 0.14, note(4), 0.1, -0.2);
    thump(mix, t + 0.25, 0.2, 100, 55, 0.14);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
