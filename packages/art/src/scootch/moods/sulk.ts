import type { MoodPose } from '../expression';

/** In a huff: slumped low and wide, eyes down and away, a pout, arms folded, under a rain cloud. */
export const sulk: MoodPose = (act) => ({
  dy: 4,
  sy: 0.88,
  sx: 1.08,
  open: 0.58,
  lx: -0.8,
  ly: 0.35,
  brows: [
    [1, 0.3],
    [1, 0.3],
  ],
  mouth: 'pout',
  hl: [-0.42, 0.72],
  hr: [-0.42, 0.8],
  blush: 0.9,
  rot: 0.03,
  fx: 'cloud',
  fxCount: act < 1 ? 2 : 3,
});
