import type { ScootchMood } from '@scootch/domain';

import { frac, TAU } from './loop-math';

/**
 * How long one turn of each mood's own loop takes, in seconds, from the design's timings. A mood
 * that is not listed has no loop of its own and only idles.
 */
export const MOOD_LOOP_SECONDS: Partial<Record<ScootchMood, number>> = {
  // The three dots count up at 1.6 a second; one turn shows none, one, two, three.
  waiting: 4 / 1.6,
  typing: 4 / 1.6,
  // A sound wave lights up 1.6 times a second.
  listening: 1 / 1.6,
  // The thought bubbles fade with sin(3t).
  thinking: TAU / 3,
  // The worried drop bobs with sin(3t).
  stuck: TAU / 3,
  // The stars pulse with |sin(4t)|; the drawing takes a full turn of the sine.
  pleased: TAU / 4,
  // One bounce is half a turn of sin(5.5t).
  celebrating: Math.PI / 5.5,
  // A letter drifts up every 1 / 0.45 seconds.
  asleep: 1 / 0.45,
  // The glint and the stars pulse like the proud stars.
  scheming: TAU / 4,
  nudge: TAU / 4,
  // A tear falls 1.1 times a second.
  dramatic: 1 / 1.1,
};

/**
 * Where a mood's loop stands at `t` seconds, 0 to 1, as the drawing's `beat`. Zero at time zero,
 * and always zero for a mood with no loop (the serious mood among them).
 */
export function moodBeat(mood: ScootchMood, t: number): number {
  const seconds = MOOD_LOOP_SECONDS[mood];
  return seconds === undefined ? 0 : frac(t / seconds);
}
