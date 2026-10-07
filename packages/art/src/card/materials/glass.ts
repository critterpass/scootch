import type { FinishMaterial } from '../material';

/** A frosted pane over drifting colour. The blobs fade wide, as they do behind the frost. */
export const glass: FinishMaterial = {
  base: [
    { kind: 'solid', color: '#ECE8E1', alpha: 1 },
    {
      kind: 'round',
      at: [0.7, 0.12],
      stops: [
        [0, '#FFD25A', 0.85],
        [0.08, '#FFD25A', 0.8],
        [0.4, '#FFD25A', 0],
      ],
    },
    {
      kind: 'round',
      at: [0.85, 0.75],
      stops: [
        [0, '#6EAAFF', 0.85],
        [0.14, '#6EAAFF', 0.8],
        [0.52, '#6EAAFF', 0],
      ],
    },
    {
      kind: 'round',
      at: [0.18, 0.22],
      stops: [
        [0, '#F0562E', 0.9],
        [0.12, '#F0562E', 0.85],
        [0.48, '#F0562E', 0],
      ],
    },
  ],
  sheen: [
    {
      kind: 'linear',
      angle: 160,
      stops: [
        [0, '#FFFFFF', 0.55],
        [0.4, '#FFFFFF', 0.12],
        [1, '#FFFFFF', 0.3],
      ],
    },
  ],
  sheenAlpha: 1,
  sheenBlend: 'normal',
  spark: 0,
  grain: 0.2,
  text: '#1C1A17',
  sub: ['#1C1A17', 0.7],
  edge: ['#FFFFFF', 0.55],
  shadow: ['#1C1A17', 0.4],
  glow: ['#FFBE78', 0.5],
};
