import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -22;

/** A bubble pops against the binder: a sharp little burst and the note of something landing. */
export const catchPop: Cue = {
  name: 'catch-pop',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([10, 20, 30]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.04, level: 0.3, from: 2400, q: 1.2 });
    marimba(mix, t + 0.03, note(12), 0.12);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
