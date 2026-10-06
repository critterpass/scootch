import type { MoodPose } from '../expression';

/** Something heavy: quiet company. Open eyes on the user, soft brows, a small closed mouth, hands down, nothing floating. It takes no attitude and no gag. */
export const serious: MoodPose = () => ({
  open: 1,
  pup: 0.6,
  ly: -0.08,
  brows: [
    [-2, -0.14],
    [-2, -0.14],
  ],
  mouth: 'smile',
  mw: 0.42,
  blush: 0.55,
  hl: [1.0, 0.7],
  hr: [1.0, 0.7],
});
