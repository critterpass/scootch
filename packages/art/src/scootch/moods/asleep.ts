import type { MoodPose } from '../expression';

/** Done for today: eyes shut, a small smile and letters drifting up. */
export const asleep: MoodPose = (act) => ({
  eye: 'closed',
  mouth: 'smile',
  mw: 0.45 + 0.1 * act,
  hl: [1.0, 0.64 + 0.06 * act],
  hr: [1.0, 0.64 + 0.06 * act],
  fx: 'zzz',
  fxCount: act < 1 ? 2 : 3,
});
