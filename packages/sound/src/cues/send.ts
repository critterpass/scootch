import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { bell, marimba } from '../instruments/tuned';

const LOUDNESS = -21;

/** A message goes off: a whoosh that opens upward, two marimba notes climbing after it and a small bell. */
export const send: Cue = {
  name: 'send',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([6, 40, 10]),
  render() {
    const mix = createMix(3.5);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.3, level: 0.11, from: 450, to: 5200, q: 1, wet: 0.35 });
    marimba(mix, t + 0.09, note(7), 0.13, -0.2);
    marimba(mix, t + 0.17, note(10), 0.14, 0.2);
    bell(mix, t + 0.25, note(14), 0.045);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
