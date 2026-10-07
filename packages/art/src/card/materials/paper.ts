import type { FinishMaterial } from '../material';

/** Uncoated stock with a soft fibre grain. Everyone's. */
export const paper: FinishMaterial = {
  base: [{ kind: 'solid', color: '#FBF8F3', alpha: 1 }],
  sheen: [
    {
      kind: 'linear',
      angle: 115,
      stops: [
        [0.35, '#FFFFFF', 0],
        [0.5, '#FFFFFF', 0.7],
        [0.65, '#FFFFFF', 0],
      ],
    },
  ],
  sheenAlpha: 0.6,
  sheenBlend: 'normal',
  spark: 0,
  grain: 0.5,
  text: '#1C1A17',
  sub: ['#6F6A62', 1],
  edge: ['#1C1A17', 0.1],
  shadow: ['#1C1A17', 0.45],
  glow: ['#FFFFFF', 0.7],
};
