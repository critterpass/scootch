import type { FinishMaterial } from '../material';

/** Translucent gel, inner glow, wet highlight. */
export const jelly: FinishMaterial = {
  base: [
    {
      kind: 'oval',
      at: [0.3, 0.1],
      size: [1.2, 0.9],
      stops: [
        [0, '#FFC1AD', 1],
        [0.35, '#F7774F', 1],
        [0.55, '#F0562E', 1],
        [1, '#A92F14', 1],
      ],
    },
    // The light caught inside the top of the gel and the depth at its foot.
    {
      kind: 'linear',
      angle: 180,
      stops: [
        [0, '#FFFFFF', 0.4],
        [0.14, '#FFFFFF', 0],
      ],
    },
    {
      kind: 'linear',
      angle: 180,
      stops: [
        [0.72, '#6E1400', 0],
        [1, '#6E1400', 0.5],
      ],
    },
  ],
  sheen: [
    {
      kind: 'oval',
      at: [0.35, 0.1],
      size: [0.55, 0.22],
      stops: [
        [0, '#FFFFFF', 0.85],
        [0.7, '#FFFFFF', 0],
      ],
    },
    {
      kind: 'oval',
      at: [0.7, 0.92],
      size: [0.3, 0.12],
      stops: [
        [0, '#FFDCC8', 0.6],
        [0.7, '#FFFFFF', 0],
      ],
    },
  ],
  sheenAlpha: 1,
  sheenBlend: 'normal',
  spark: 0,
  grain: 0,
  text: '#FFF8F3',
  sub: ['#FFF8F3', 0.85],
  edge: ['#FFFFFF', 0.25],
  shadow: ['#F0562E', 0.6],
  glow: ['#F0562E', 0.45],
};
