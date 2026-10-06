import type { MoodPose } from '../expression';

/** The user is typing: Scootch watches the words arrive, eyes down, and waits its turn. */
export const typing: MoodPose = (act) => ({
  open: 1,
  pup: 0.54,
  ly: 0.7,
  brows: [
    [-4, -0.08],
    [-4, -0.08],
  ],
  mouth: 'smile',
  mw: 0.5 + 0.1 * act,
  hl: [0.9, 0.74],
  hr: [0.9, 0.74],
  lean: 1.5,
  fx: 'dots',
});
