import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { note } from '../instruments/scale';
import { bell as ring } from '../instruments/tuned';

const LOUDNESS = -21;

/** The school bell at the end of recess: a small bell struck quickly, five times, fading. */
export const bell: Cue = {
  name: 'bell',
  loudness: LOUDNESS,
  haptics: [tap(0, 12), tap(140, 12)],
  render() {
    const mix = createMix(3.4);
    for (let i = 0; i < 5; i += 1) {
      ring(mix, 0.012 + i * 0.14, note(14), 0.09 - i * 0.012, i % 2 ? 0.25 : -0.25, 0.7);
    }
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
