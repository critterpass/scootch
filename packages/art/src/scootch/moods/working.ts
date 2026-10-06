import type { MoodPose } from '../expression';

/** Head down beside the user: eyes on the desk, tongue out, both hands busy. */
export const working: MoodPose = (act) => ({
  open: 0.55 - (act - 1) * 0.15,
  ly: 0.8,
  pup: 0.52,
  brows: [
    [1, 0.16],
    [1, 0.16],
  ],
  mouth: 'tongue',
  mx: 0.3,
  hl: [0.42, 0.9],
  hr: [0.42, 0.9],
  fx: 'laptop',
});
