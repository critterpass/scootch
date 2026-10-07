import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -26;

/** One key of the composer: a dry click with a faint high marimba note behind it. */
export const tick: Cue = {
  name: 'tick',
  loudness: LOUDNESS,
  haptics: [tap(0, 7)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, { seconds: 0.02, level: 0.07, from: 3400, q: 3, wet: 0.05 });
    marimba(mix, t, note(10), 0.05, 0, 0.15);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
