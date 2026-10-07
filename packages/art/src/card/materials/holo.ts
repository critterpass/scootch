import type { GradientStop } from '../../core/commands';
import type { FinishMaterial } from '../material';

/** One turn of the rainbow, a fifth of the band long. */
const TURN = ['#FF69B4', '#64D7FF', '#FFEB78', '#9678FF'] as const;
const TURNS = 5;

/** The rainbow repeated along the band, as the board's repeating gradient lays it. */
const rainbow = Array.from({ length: TURNS * TURN.length + 1 }, (_, index): GradientStop => [
  index / (TURNS * TURN.length),
  TURN[index % TURN.length] ?? TURN[0],
  0.5,
]);

/** Rainbow diffraction that chases the tilt. */
export const holo: FinishMaterial = {
  base: [
    {
      kind: 'linear',
      angle: 135,
      stops: [
        [0, '#F3EDFB', 1],
        [0.45, '#E6F7F6', 1],
        [1, '#FBF1E4', 1],
      ],
    },
  ],
  sheen: [{ kind: 'linear', angle: 115, stops: rainbow }],
  sheenAlpha: 0.9,
  sheenBlend: 'normal',
  spark: 0.9,
  grain: 0.2,
  text: '#1C1A17',
  sub: ['#1C1A17', 0.65],
  edge: ['#FFFFFF', 0.7],
  shadow: ['#502878', 0.45],
  glow: ['#C8A0FF', 0.55],
};
