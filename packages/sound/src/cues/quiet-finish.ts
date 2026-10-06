import { createMix, finishMix, place } from '../core/mix';
import { renderTone } from '../core/oscillator';
import { type Cue, tap } from '../cue';
import { note, noteHz } from '../instruments/scale';
import { bell, pad } from '../instruments/tuned';

const LOUDNESS = -27;

/**
 * The finish for a serious task: one soft chord settling over a low note and a single distant bell.
 * No drum, no clap, no run of notes, no voice.
 */
export const quietFinish: Cue = {
  name: 'quiet-finish',
  loudness: LOUDNESS,
  haptics: [tap(0, 24), tap(420, 14)],
  render() {
    const mix = createMix(5);
    const t = 0.012;
    pad(mix, t, [note(0) - 12, note(0), note(2), note(4)], 2.6, 0.03, 1.1);
    const floor = renderTone({
      wave: 'sine',
      freq: noteHz(0) / 2,
      attack: 0.06,
      peak: 0.08,
      seconds: 1.8,
    });
    place(mix, floor, t);
    bell(mix, t + 0.42, note(7), 0.02);
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
