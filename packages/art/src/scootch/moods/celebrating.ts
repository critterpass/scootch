import type { MoodPose } from '../expression';

/** The win: arms up, a wide grin and confetti. The beat lifts it off the ground and back. */
export const celebrating: MoodPose = (act, beat) => {
  const jump = Math.sin(Math.PI * beat);
  return {
    bounce: jump,
    dy: -jump * 22,
    sy: 1 + jump * 0.06,
    sx: 1 - jump * 0.04,
    eye: 'happy',
    mouth: 'grin',
    mw: 1.25 * (0.8 + 0.2 * act),
    hl: [1.12, 0.64 - 1.66 * Math.min(act, 1.1)],
    hr: [1.12, 0.64 - 1.66 * Math.min(act, 1.1)],
    brows: [
      [-6, -0.12],
      [-6, -0.12],
    ],
    blush: 1.1,
    fx: 'confetti',
    fxCount: Math.round(18 * act),
    tip: Math.cos(Math.PI * 2 * beat) * 5,
  };
};
