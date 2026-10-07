import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -23;

/** Scootch starts listening: two quick marimba notes stepping up, with one light tap. */
export const listen: Cue = {
  name: 'listen',
  loudness: LOUDNESS,
  haptics: [tap(0, 10)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    marimba(mix, t, note(5), 0.09, -0.2, 0.3);
    marimba(mix, t + 0.07, note(7), 0.1, 0.2, 0.3);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
