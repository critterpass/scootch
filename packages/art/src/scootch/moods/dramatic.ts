import type { MoodPose } from '../expression';

/** Nothing is wrong and everything is over: shut eyes, a wail, tears and one hand flung up. */
export const dramatic: MoodPose = () => ({
  rot: -0.1,
  lean: -3,
  eye: 'squeeze',
  mouth: 'wail',
  brows: [
    [-4, -0.42],
    [-4, -0.42],
  ],
  hl: [1.32, -0.25],
  hr: [0.62, -0.78],
  fx: 'tears',
  fxCount: 2,
});
