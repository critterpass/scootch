import type { MoodPose } from '../expression';

/** Pleased with a plan nobody has heard: heavy lids, a slanted look, a cat's mouth and one glint. */
export const scheming: MoodPose = () => ({
  dy: 1,
  sy: 0.98,
  open: 0.42,
  tilt: 0.55,
  lx: 0.75,
  ly: 0.1,
  brows: [
    [3, 0.45],
    [3, 0.45],
  ],
  mouth: 'cat',
  mx: 0.3,
  hl: [0.2, 0.74],
  hr: [0.2, 0.74],
  fx: 'stars',
  fxCount: 1,
});
