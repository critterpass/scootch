import type { MoodPose } from '../expression';

/** Quietly proud of the user: star eyes, a grin, hands together and a few stars. */
export const pleased: MoodPose = (act) => ({
  eye: 'sparkle',
  mouth: 'grin',
  mw: 0.9 * (0.8 + 0.2 * act),
  hl: [0, 0.78],
  hr: [0, 0.78],
  blush: 0.7 + 0.5 * act,
  dy: -2,
  brows: [
    [-5, -0.1],
    [-5, -0.1],
  ],
  fx: 'stars',
  fxCount: act < 1 ? 2 : 4,
});
