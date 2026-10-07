import type { MoodPose } from '../expression';

/** Asking for a smaller step: big wet eyes, a pout, clasped hands, a tremble and a slow lean. */
export const bargaining: MoodPose = (act, _beat, t) => ({
  sx: 1 + Math.sin(t * 22) * 0.005,
  lean: Math.sin(t * 1.2) * 1.5,
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
