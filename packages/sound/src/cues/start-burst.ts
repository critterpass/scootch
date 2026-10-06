import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { clap, noiseHit, shaker, thump } from '../instruments/percussion';
import { note } from '../instruments/scale';
import { bell, marimba, pad } from '../instruments/tuned';

const LOUDNESS = -18;

/** The burst when a session starts: a thump and whoosh, a marimba run up the scale, a clap, then a bright chord. */
export const startBurst: Cue = {
  name: 'start-burst',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([22, 48, 12, 48, 12, 48, 44]),
  render() {
    const mix = createMix(4.5);
    const t = 0.012;
    const beat = 0.07;
    thump(mix, t, 0.6);
    noiseHit(mix, t, { seconds: 0.32, level: 0.2, from: 500, to: 6000, q: 0.8, wet: 0.4 });
    [0, 2, 4, 5, 7, 9].forEach((step, i) => {
      marimba(mix, t + i * beat, note(5 + step), 0.23 - i * 0.01, i % 2 ? 0.3 : -0.3);
    });
    clap(mix, t + beat * 4, 0.18);
    thump(mix, t + beat * 6, 0.35, 110, 50, 0.25);
    pad(mix, t + beat * 6, [note(5), note(7), note(9), note(12)], 1.9, 0.035);
    [0, 1, 2].forEach((i) => {
      bell(mix, t + beat * 6 + 0.02 + i * 0.07, note(15 + i * 2), 0.05, (i - 1) * 0.5);
    });
    [0, 1, 2, 3].forEach((i) => {
      shaker(mix, t + beat * (8 + i * 2), 0.045, i % 2 ? 0.4 : -0.4);
    });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
