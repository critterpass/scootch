import type { MoodPose } from '../expression';

/**
 * Pleased with a plan nobody has heard: heavy lids, a slanted look that flicks away and back, a
 * cat's mouth, hands rubbing together and one glint.
 */
export const scheming: MoodPose = (_act, _beat, t) => {
  const rub = Math.sin(t * 6) * 0.03;
  return {
    dy: 1,
    sy: 0.98,
    open: 0.42,
    tilt: 0.55,
    lx: Math.sin(t * 1.5) >= 0 ? 0.75 : -0.25,
    ly: 0.1,
    brows: [
      [3, 0.45],
      [3, 0.45],
    ],
    mouth: 'cat',
    mx: 0.3,
    hl: [0.2, 0.74 + rub],
    hr: [0.2, 0.74 - rub],
    fx: 'stars',
    fxCount: 1,
  };
};
