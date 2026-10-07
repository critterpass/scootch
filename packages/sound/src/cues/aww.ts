import { createMix, finishMix } from '../core/mix';
import type { Cue } from '../cue';
import { note, noteHz } from '../instruments/scale';
import { marimba, voice } from '../instruments/tuned';

const LOUDNESS = -22;

/**
 * Let go too early: Scootch sighs, a voice sliding down over a low marimba note.
 * The design gives it no buzz, so nothing is felt in the hand.
 */
export const aww: Cue = {
  name: 'aww',
  loudness: LOUDNESS,
  haptics: [],
  render() {
    const mix = createMix(3);
    const t = 0.012;
    voice(mix, t, noteHz(9), noteHz(5), 0.38, { level: 0.13, vibratoHz: 5 });
    marimba(mix, t + 0.06, note(4), 0.07);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
