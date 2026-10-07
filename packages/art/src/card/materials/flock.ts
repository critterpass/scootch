import type { FinishMaterial } from '../material';

/** Flocked velvet: fuzzy, matte, eats light. */
export const flock: FinishMaterial = {
  base: [
    {
      kind: 'oval',
      at: [0.3, 0.2],
      size: [0.9, 0.7],
      stops: [
        [0, '#3F6E58', 1],
        [0.55, '#2C5141', 1],
        [1, '#1F3B2F', 1],
      ],
    },
    // The pile swallows light towards its edges.
    {
      kind: 'oval',
      at: [0.5, 0.5],
      size: [0.72, 0.72],
      stops: [
        [0.6, '#000000', 0],
        [1, '#000000', 0.4],
      ],
    },
  ],
  sheen: [
    {
      kind: 'oval',
      at: [0.3, 0.15],
      size: [0.7, 0.5],
      stops: [
        [0, '#FFFFFF', 0.14],
        [0.7, '#FFFFFF', 0],
      ],
    },
  ],
  sheenAlpha: 1,
  sheenBlend: 'normal',
  spark: 0,
  grain: 0.9,
  text: '#F3EBDD',
  sub: ['#F3EBDD', 0.78],
  edge: ['#FFFFFF', 0.06],
  shadow: ['#14281E', 0.6],
  glow: ['#5A966E', 0.4],
};
