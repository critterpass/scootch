import { settle, type MoodPose } from '../expression';

/**
 * The win: arms up and waving, a wide grin and confetti. The beat lifts it off the ground and
 * back; each landing squashes it flat and wide for a moment before the next jump.
 */
export const celebrating: MoodPose = (act, beat, t) => {
  const jump = Math.sin(Math.PI * beat);
  // The still stands at full height: the squash belongs to a landing, not to standing there.
  const moving = settle(t);
  const land = (1 - jump) ** 6 * moving;
  const arms = 0.64 - 1.66 * Math.min(act, 1.1);
  return {
    bounce: jump,
    dy: -jump * 22,
    sy: 1 - land * 0.16 + jump * 0.06,
    sx: 1 + land * 0.12 - jump * 0.04,
    eye: 'happy',
    mouth: 'grin',
    mw: 1.25 * (0.8 + 0.2 * act),
    hl: [1.12 + Math.sin(t * 11) * 0.1, arms],
    hr: [1.12 + moving * Math.sin(t * 11 + 1) * 0.1, arms],
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
