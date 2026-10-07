import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -24;

/** Something lands in the binder: one bright marimba note. */
export const catchLanded: Cue = {
  name: 'catch-landed',
  loudness: LOUDNESS,
  haptics: [tap(0, 10)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    marimba(mix, t, note(12), 0.12);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
