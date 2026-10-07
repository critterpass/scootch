import type { MoodPose } from '../expression';

/** Done for today: eyes shut, a small smile, slow breaths, a gentle rock and letters drifting up. */
export const asleep: MoodPose = (act, _beat, t) => ({
  dy: Math.sin(t * 1.2) * 1.5,
  sy: 1 + Math.sin(t * 1.2) * 0.02,
  rot: Math.sin(t * 0.6) * 0.03,
  eye: 'closed',
  mouth: 'smile',
  mw: 0.45 + 0.1 * act,
  hl: [1.0, 0.64 + 0.06 * act],
  hr: [1.0, 0.64 + 0.06 * act],
  fx: 'zzz',
  fxCount: act < 1 ? 2 : 3,
});
