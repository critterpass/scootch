import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { note } from '../instruments/scale';
import { bell, marimba } from '../instruments/tuned';

const LOUDNESS = -22;

/** The thing is done and the catch unlocks: two marimba notes climbing to a bell. */
export const catchUnlock: Cue = {
  name: 'catch-unlock',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([8, 40, 12]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    marimba(mix, t, note(7), 0.12);
    marimba(mix, t + 0.08, note(10), 0.12);
    bell(mix, t + 0.16, note(14), 0.05);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
