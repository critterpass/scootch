import type { MoodPose } from '../expression';

/** The session has stalled: small pupils, worried brows, a wobbly mouth and a drop of sweat. */
export const stuck: MoodPose = (act) => ({
  open: 0.98,
  pup: 0.58 - 0.14 * act,
  brows: [
    [-3, -0.32],
    [-3, -0.32],
  ],
  mouth: 'wobble',
  hl: [0.46, 0.68],
  hr: [0.46, 0.68],
  fx: 'sweat',
  fxCount: act > 1 ? 2 : 1,
});
