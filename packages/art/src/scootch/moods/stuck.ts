import type { MoodPose } from '../expression';

/**
 * The session has stalled: small pupils darting from side to side, worried brows, a wobbly mouth,
 * trembling hands, a shiver and a drop of sweat.
 */
export const stuck: MoodPose = (act, _beat, t) => ({
  lx: Math.sin(t * 3.1) * 0.65,
  sx: 1 + Math.sin(t * 30) * 0.004,
  open: 0.98,
  pup: 0.58 - 0.14 * act,
  brows: [
    [-3, -0.32],
    [-3, -0.32],
  ],
  mouth: 'wobble',
  hl: [0.46, 0.68 + Math.sin(t * 9) * 0.025],
  hr: [0.46, 0.68 - Math.sin(t * 9) * 0.025],
  fx: 'sweat',
  fxCount: act > 1 ? 2 : 1,
});
