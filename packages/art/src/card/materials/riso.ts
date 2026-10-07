import type { FinishMaterial } from '../material';

/** Two-ink halftone, slightly off register. */
export const riso: FinishMaterial = {
  base: [
    { kind: 'solid', color: '#F4EBDA', alpha: 1 },
    { kind: 'dots', step: 6, radius: 1.3, offset: [3, 3], color: '#3460C8', alpha: 0.4 },
    { kind: 'dots', step: 6, radius: 1.3, offset: [0, 0], color: '#F0562E', alpha: 0.8 },
  ],
  sheen: [
    {
      kind: 'linear',
      angle: 115,
      stops: [
        [0.4, '#FFFFFF', 0],
        [0.5, '#FFFFFF', 0.35],
        [0.6, '#FFFFFF', 0],
      ],
    },
  ],
  sheenAlpha: 0.7,
  sheenBlend: 'normal',
  spark: 0,
  grain: 0.6,
  text: '#1C1A17',
  sub: ['#4E443B', 1],
  edge: ['#1C1A17', 0.1],
  shadow: ['#1C1A17', 0.45],
  glow: ['#F0562E', 0.3],
};
