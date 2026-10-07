import type { MoodPose } from '../expression';

/**
 * Nothing is happening yet: a heavy-lidded side glance, a slow lean from side to side and one hand
 * tapping.
 */
export const waiting: MoodPose = (act, _beat, t) => ({
  open: 0.6 - (act - 1) * 0.3,
  lx: 0.75,
  ly: -0.1,
  mouth: 'flat',
  mw: 0.7,
  lean: Math.sin(t * 0.5) * 2.5,
  hr: [1.12, 0.5 - (act - 1) * 0.4 - Math.abs(Math.sin(t * 5)) * 0.14],
  brows: [
    [3, 0],
    [3, 0],
  ],
  fx: 'dots',
});
