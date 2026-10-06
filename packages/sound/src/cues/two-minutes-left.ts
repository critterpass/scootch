import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { note } from '../instruments/scale';
import { bell, marimba } from '../instruments/tuned';

const LOUDNESS = -21;

/** Two minutes left: two unhurried bells a step apart over one marimba note. A reminder, not an alarm. */
export const twoMinutesLeft: Cue = {
  name: 'two-minutes-left',
  loudness: LOUDNESS,
  haptics: [tap(0, 14), tap(260, 14)],
  render() {
    const mix = createMix(4);
    const t = 0.012;
    marimba(mix, t, note(5), 0.08, -0.2);
    bell(mix, t, note(9), 0.06, -0.3);
    bell(mix, t + 0.26, note(10), 0.06, 0.3);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
