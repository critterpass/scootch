import type { FinishMaterial } from '../material';

/** Polished steel; a bright band sweeps as it turns. */
export const chrome: FinishMaterial = {
  base: [
    {
      kind: 'linear',
      angle: 165,
      stops: [
        [0, '#FDFDFC', 1],
        [0.2, '#B9B5AE', 1],
        [0.36, '#F2EFEA', 1],
        [0.5, '#5F5B56', 1],
        [0.62, '#D6D2CC', 1],
        [0.8, '#8A867F', 1],
        [1, '#F4F2EE', 1],
      ],
    },
  ],
  sheen: [
    {
      kind: 'linear',
      angle: 115,
      stops: [
        [0.38, '#FFFFFF', 0],
        [0.48, '#FFFFFF', 0.95],
        [0.58, '#FFFFFF', 0],
      ],
    },
  ],
  sheenAlpha: 1,
  sheenBlend: 'screen',
  spark: 0,
  grain: 0.15,
  text: '#1C1A17',
  sub: ['#1C1A17', 0.7],
  edge: ['#000000', 0.12],
  shadow: ['#1C1A17', 0.55],
  glow: ['#FFFFFF', 0.8],
};
