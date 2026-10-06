import type { MoodPose } from '../expression';

/**
 * Something heavy: Scootch listens. A hand to its ear, open eyes, a small round mouth and no
 * smile. It takes no attitude and no gag, so it is the same drawing for everyone.
 */
export const serious: MoodPose = () => ({
  dy: -3,
  sy: 1.04,
  sx: 0.97,
  open: 1.12,
  pup: 0.5,
  lx: -0.15,
  ly: -0.25,
  brows: [
    [-6, -0.15],
    [-6, -0.15],
  ],
  mouth: 'o',
  mw: 0.8,
  hl: [1.0, -0.28],
  lean: -2,
  fx: 'waves',
});
