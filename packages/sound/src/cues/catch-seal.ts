import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { noiseHit, thump } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -22;

/** A seal pressed onto an envelope: one firm, low drum and the note it leaves. */
export const catchSeal: Cue = {
  name: 'catch-seal',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([24, 20]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    thump(mix, t, 0.6, 160, 50, 0.25);
    noiseHit(mix, t, { seconds: 0.03, level: 0.08, from: 1800, q: 1, wet: 0.1 });
    marimba(mix, t + 0.02, note(2), 0.08);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
