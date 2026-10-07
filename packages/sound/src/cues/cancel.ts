import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -22;

/** Never mind: two marimba notes stepping down, with one light tap. */
export const cancel: Cue = {
  name: 'cancel',
  loudness: LOUDNESS,
  haptics: [tap(0, 10)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    marimba(mix, t, note(7), 0.09, 0.2);
    marimba(mix, t + 0.09, note(4), 0.08, -0.2);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
