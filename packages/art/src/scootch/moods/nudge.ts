import type { MoodPose } from '../expression';

/** A friendly reminder: smiling eyes, a lean towards the user, one hand up and waving, stars. */
export const nudge: MoodPose = (act, _beat, t) => ({
  eye: 'happy',
  mouth: 'smile',
  hr: [1.25, -0.5 + Math.sin(t * 9) * 0.12],
  lean: 3,
  blush: 1,
  fx: 'stars',
  fxCount: act < 1 ? 2 : 4,
});
