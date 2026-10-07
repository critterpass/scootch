import { settle, type MoodPose } from '../expression';

/** Head down beside the user: eyes on the desk, tongue out, both hands typing in turn. */
export const working: MoodPose = (act, _beat, t) => ({
  open: 0.55 - (act - 1) * 0.15,
  ly: 0.8,
  pup: 0.52,
  brows: [
    [1, 0.16],
    [1, 0.16],
  ],
  mouth: 'tongue',
  mx: 0.3,
  hl: [0.42, 0.9 + Math.sin(t * 16) * 0.05],
  hr: [0.42, 0.9 + settle(t) * Math.sin(t * 16 + 1.7) * 0.05],
  fx: 'laptop',
});
