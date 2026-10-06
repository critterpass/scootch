import type { MoodPose } from '../expression';

/** Working out a reply: eyes up and away, one brow up, a hand at its chin. */
export const thinking: MoodPose = () => ({
  lx: -0.6,
  ly: -0.65,
  open: 0.92,
  brows: [
    [-7, -0.25],
    [1, 0.12],
  ],
  mouth: 'side',
  mx: 0.35,
  hr: [0.32, 0.7],
  rot: -0.05,
  fx: 'think',
});
