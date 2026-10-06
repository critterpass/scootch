import type { MoodPose } from '../expression';

/** The user is talking: up on its toes, wide eyes, a hand to its ear. */
export const listening: MoodPose = (act) => ({
  dy: -3,
  sy: 1.04,
  sx: 0.97,
  open: 1 + 0.12 * act,
  pup: 0.5,
  lx: -0.15,
  ly: -0.25,
  brows: [
    [-6, -0.15],
    [-6, -0.15],
  ],
  mouth: 'o',
  mw: 0.8,
  hl: [1.0, 0.64 - 0.92 * act],
  lean: -2,
  fx: 'waves',
  fxCount: act < 1 ? 2 : 3,
});
