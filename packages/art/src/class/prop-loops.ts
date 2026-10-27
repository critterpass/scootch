/** The props' loops, from the Prop board's CSS. `motion.ts` names them with the rest. */
import { CURVES, swing, type Loop } from './curves';

const WING: Loop = {
  periodMs: 360,
  curve: CURVES.easeInOut,
  frames: [
    { at: 0, scaleX: 1 },
    { at: 0.5, scaleX: 0.35 },
    { at: 1, scaleX: 1 },
  ],
};

export const PROP_LOOPS = {
  legA: swing(460, 16, -16),
  legB: swing(460, 16, -16, -230),
  tail: swing(1300, 0, 12),
  head: {
    periodMs: 920,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 0 },
      { at: 0.5, y: -1.5 },
      { at: 1, y: 0 },
    ],
  },
  flame: {
    periodMs: 900,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, scaleX: 1, scaleY: 1, rotate: -2 },
      { at: 0.5, scaleX: 0.9, scaleY: 1.1, rotate: 3 },
      { at: 1, scaleX: 1, scaleY: 1, rotate: -2 },
    ],
  },
  glow: {
    periodMs: 1800,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, opacity: 0.22, scaleX: 1, scaleY: 1 },
      { at: 0.5, opacity: 0.34, scaleX: 1.12, scaleY: 1.12 },
      { at: 1, opacity: 0.22, scaleX: 1, scaleY: 1 },
    ],
  },
  drip: {
    periodMs: 1200,
    curve: [0.42, 0, 1, 1],
    frames: [
      { at: 0, y: -12, opacity: 0 },
      { at: 0.25, opacity: 1 },
      { at: 1, y: 16, opacity: 0 },
    ],
  },
  wingL: WING,
  wingR: WING,
  steam: {
    periodMs: 2400,
    curve: CURVES.easeInOut,
    frames: [
      { at: 0, y: 4, opacity: 0, scaleY: 0.8 },
      { at: 0.4, opacity: 0.8 },
      { at: 1, y: -8, opacity: 0, scaleY: 1.1 },
    ],
  },
} as const satisfies Record<string, Loop>;
