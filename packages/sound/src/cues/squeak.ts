import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { note, noteHz } from '../instruments/scale';
import { bell, marimba, voice } from '../instruments/tuned';

const LOUDNESS = -20;

/** Scootch's squeak when tapped: two rising chirps, a marimba note and a tiny bell. */
export const squeak: Cue = {
  name: 'squeak',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([8, 60, 12]),
  render() {
    const mix = createMix(3.5);
    const t = 0.012;
    voice(mix, t, noteHz(5), noteHz(7), 0.11, { level: 0.15 });
    voice(mix, t + 0.12, noteHz(7), noteHz(9) * 1.02, 0.17, { level: 0.16 });
    marimba(mix, t + 0.27, note(10), 0.13, 0.3);
    bell(mix, t + 0.31, note(14), 0.04, -0.3);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
