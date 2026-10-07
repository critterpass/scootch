import type { MoodPose } from '../expression';

/**
 * Quietly proud of the user: star eyes that turn and pulse, a grin, hands together, a happy bob
 * and a few stars.
 */
export const pleased: MoodPose = (act, _beat, t) => ({
  eye: 'sparkle',
  mouth: 'grin',
  mw: 0.9 * (0.8 + 0.2 * act),
  hl: [0, 0.78],
  hr: [0, 0.78],
  blush: 0.7 + 0.5 * act,
  dy: -2 + Math.sin(t * 3) * 2,
  sy: 1 + Math.sin(t * 6) * 0.015,
  sparkTurn: t * 0.8,
  sparkSize: 1 + Math.sin(t * 8) * 0.08,
  brows: [
    [-5, -0.1],
    [-5, -0.1],
  ],
  fx: 'stars',
  fxCount: act < 1 ? 2 : 4,
});
