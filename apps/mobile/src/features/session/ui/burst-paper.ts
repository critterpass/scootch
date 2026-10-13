import type { BurstInks, BurstMark, MarkShape, Throw } from './burst-shapes';
import { between, launch, mix, STILL, type Next } from './burst-throw';

const square = (size: number) => [size, size] as const;

/** How big a piece of paper is cut, as width and height. */
function paperSize(cut: MarkShape, next: Next): readonly [number, number] {
  switch (cut) {
    case 'strip':
      return [between(next, 5, 6.5), between(next, 12, 16)];
    case 'zigzag':
      return [16, 8];
    case 'curl':
      return square(between(next, 12, 15));
    case 'star':
      return square(between(next, 12, 15));
    case 'dot':
      return square(between(next, 6.5, 8.5));
    case 'square':
    case 'sparkle':
    case 'fleck':
    case 'bubble':
    case 'droplet':
    case 'blot':
      return square(between(next, 8, 10));
  }
}

/** Cut paper: strips, squares, dots, curls, zigzags and the odd tiny star, tumbling as they fall. */
export function paper(shape: Throw, next: Next, inks: BurstInks): BurstMark[] {
  const colors = [
    inks.tomato,
    inks.ink,
    inks.tomato,
    mix(inks.tomato, inks.page, 0.45),
    '#FFC94A',
    inks.tomato,
    inks.ink,
  ];
  const cuts: readonly MarkShape[] = [
    'strip',
    'square',
    'strip',
    'dot',
    'curl',
    'strip',
    'zigzag',
    'square',
    'strip',
    'star',
  ];
  return Array.from({ length: shape.count }, (_, id) => {
    const cut = cuts[id % cuts.length] ?? 'strip';
    // One in seven is close to the eye: larger, and thrown a little harder.
    const near = id % 7 === 3;
    const scale = near ? between(next, 1.35, 1.6) : between(next, 0.8, 1.08);
    const [width, height] = paperSize(cut, next);
    const thrown = launch(shape, next, near ? 1.12 : 1);
    return {
      ...STILL,
      id,
      shape: cut,
      color: colors[id % colors.length] ?? inks.tomato,
      width,
      height,
      ...thrown,
      life: between(next, 1900, 2350),
      drag: between(next, 2.3, 3),
      gravity: between(next, 380, 470),
      rotation: next() * Math.PI * 2,
      spin: (next() - 0.5) * 7,
      flip: (cut === 'dot' ? 0 : 1) * between(next, 7, 13) * (next() > 0.5 ? 1 : -1),
      flipAxis: id % 3 === 0 ? 'y' : 'x',
      sway: between(next, 10, 26),
      swayRate: between(next, 4.5, 7.5),
      phase: next() * Math.PI * 2,
      scale,
      opacity: near ? 1 : between(next, 0.9, 1),
      fadeFrom: 0.74,
    } satisfies BurstMark;
  });
}
