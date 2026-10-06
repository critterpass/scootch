import type { MoodPose } from '../expression';

/** Asking for a smaller step: big wet eyes, a pout and clasped hands. */
export const bargaining: MoodPose = (act) => ({
  open: 1.06,
  pup: Math.min(0.8, 0.58 + 0.16 * act),
  gloss: true,
  ly: -0.3,
  brows: [
    [-3, -0.38],
    [-3, -0.38],
  ],
  mouth: 'pout',
  mw: 0.8,
  hl: [-0.02, 0.78],
  hr: [-0.02, 0.78],
  blush: 0.7 + 0.3 * act,
});
