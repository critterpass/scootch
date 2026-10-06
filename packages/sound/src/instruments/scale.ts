import { midiToHz } from '../core/oscillator';

/** Everything Scootch plays is in one key: D major pentatonic, from the D above middle C. */
export const KEY_ROOT = 62;
export const PENTATONIC = [0, 2, 4, 7, 9] as const;

/** The MIDI note of a scale step: 0 is the root, 5 the root an octave up, negatives go below. */
export function note(step: number): number {
  const degree = ((step % 5) + 5) % 5;
  return KEY_ROOT + (PENTATONIC[degree] ?? 0) + 12 * Math.floor(step / 5);
}

/** The frequency in hertz of a scale step. */
export function noteHz(step: number): number {
  return midiToHz(note(step));
}
