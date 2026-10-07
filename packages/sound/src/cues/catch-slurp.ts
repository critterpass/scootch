import { createMix, finishMix } from '../core/mix';
import { type Cue, tapsFromBuzzes } from '../cue';
import { thump } from '../instruments/percussion';
import { voice } from '../instruments/tuned';

const LOUDNESS = -21;

/** He goes up the nozzle: a low thump and a burp that sinks. */
export const catchSlurp: Cue = {
  name: 'catch-slurp',
  loudness: LOUDNESS,
  haptics: tapsFromBuzzes([20, 40, 20]),
  render() {
    const mix = createMix(3);
    const t = 0.012;
    thump(mix, t, 0.5, 90, 40, 0.3);
    voice(mix, t + 0.1, 130, 80, 0.25, { level: 0.12, vibratoHz: 0, wave: 'sawtooth' });
    return finishMix(mix, { loudness: LOUDNESS });
  },
};
