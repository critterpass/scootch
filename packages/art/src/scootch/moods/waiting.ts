import type { MoodPose } from '../expression';

/** Nothing is happening yet: a heavy-lidded side glance and one hand tapping. */
export const waiting: MoodPose = (act) => ({
  open: 0.6 - (act - 1) * 0.3,
  lx: 0.75,
  ly: -0.1,
  mouth: 'flat',
  mw: 0.7,
  hr: [1.12, 0.5 - (act - 1) * 0.4],
  brows: [
    [3, 0],
    [3, 0],
  ],
  fx: 'dots',
});
