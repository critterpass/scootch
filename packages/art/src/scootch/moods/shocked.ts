import type { MoodPose } from '../expression';

/** Caught off guard: eyes wide with tiny pupils, brows up, a round mouth, hands up, a jitter. */
export const shocked: MoodPose = (_act, _beat, t) => ({
  open: 1.2,
  pup: 0.34,
  mouth: 'o',
  mw: 1.2,
  brows: [
    [-9, -0.1],
    [-9, -0.1],
  ],
  hl: [0.55, 0.2],
  hr: [0.55, 0.2],
  dy: -2 + Math.sin(t * 40) * 0.6,
  sy: 1.05,
});
