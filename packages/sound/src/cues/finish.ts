import { createMix, finishMix, place } from '../core/mix';
import { renderTone } from '../core/oscillator';
import { type Cue, tapsFromBuzzes } from '../cue';
import { clap, noiseHit, thump } from '../instruments/percussion';
import { note, noteHz } from '../instruments/scale';
import { bell, marimba, pad, voice } from '../instruments/tuned';

const LOUDNESS = -17;

/** The finish: a deep thump and a falling wash, a wide chord, a cascade of bells, a marimba flourish and a happy squeak. */
export const finish: Cue = {
  name: 'finish',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([32, 40, 60, 40, 30, 40, 180]),
  render() {
    const mix = createMix(6);
    const t = 0.012;
    thump(mix, t, 0.75, 120, 38, 0.7);
    noiseHit(mix, t, {
      seconds: 0.7,
      level: 0.22,
      filter: 'lowpass',
      from: 9000,
      to: 260,
      q: 1.07,
      wet: 0.7,
    });
    clap(mix, t, 0.16);
    pad(mix, t, [note(0) - 12, note(0), note(2), note(4), note(7)], 3, 0.045, 1.3);
    const floor = renderTone({
      wave: 'sine',
      freq: noteHz(0) / 4,
      attack: 0.02,
      peak: 0.22,
      seconds: 2.22,
    });
    place(mix, floor, t);
    for (let i = 0; i < 10; i += 1) {
      const step = 19 - i + (i > 4 ? 6 : 0);
      bell(mix, t + 0.1 + i * 0.052, note(step), 0.05 - i * 0.003, ((i % 3) - 1) * 0.55);
    }
    [0, 2, 4, 5].forEach((step, i) => {
      marimba(mix, t + 0.62 + i * 0.1, note(10 + step), 0.13, i % 2 ? 0.3 : -0.3);
    });
    voice(mix, t + 1.08, noteHz(10), noteHz(12), 0.24, { level: 0.12 });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
