import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { thump } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -21;

/** The rope pulls tight round him: a short drum and a marimba note. */
export const catchCinch: Cue = {
  name: 'catch-cinch',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([20, 20, 30]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    thump(mix, t, 0.55, 140, 50, 0.25);
    marimba(mix, t, note(5), 0.12);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
