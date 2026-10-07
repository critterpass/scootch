import { createMix, finishMix } from '../core/mix';
import { type Cue, tap } from '../cue';
import { noiseHit } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { marimba } from '../instruments/tuned';

const LOUDNESS = -25;

/** A sticker comes off its sheet: a bright rip and a small marimba note. */
export const catchPeel: Cue = {
  name: 'catch-peel',
  loudness: LOUDNESS,
  haptics: [tap(0, 12)],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    noiseHit(mix, t, {
      seconds: 0.28,
      level: 0.12,
      filter: 'highpass',
      from: 2500,
      to: 6000,
      q: 0.8,
      wet: 0.2,
    });
    marimba(mix, t + 0.05, note(7), 0.08);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
