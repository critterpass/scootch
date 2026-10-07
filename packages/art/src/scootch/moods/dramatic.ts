import type { MoodPose } from '../expression';

/**
 * Nothing is wrong and everything is over: thrown back and swaying, shut eyes, a wobbling wail,
 * tears and one hand flung up.
 */
export const dramatic: MoodPose = (_act, _beat, t) => ({
  rot: -0.1 + Math.sin(t * 1.3) * 0.03,
  lean: -3,
  eye: 'squeeze',
  mouth: 'wail',
  wail: t * 6,
  brows: [
    [-4, -0.42],
    [-4, -0.42],
  ],
  hl: [1.32, -0.25 + Math.sin(t * 2) * 0.06],
  hr: [0.62, -0.78],
  fx: 'tears',
  fxCount: 2,
});
