import type { BurstInks, BurstMark, Throw } from './burst-shapes';
import { ALL_ROUND, between, launch, STILL, type Next } from './burst-throw';

const GOLD = ['#FFC94A', '#FFE6A3', '#F2A93B', '#FFD66B'] as const;

/**
 * Stardust: gold four-point sparkles and flecks that twinkle out of step, hang in the air a beat
 * too long and drift, and a few sparkles that leave a trail of gold behind them.
 */
export function stardust(shape: Throw, next: Next, first: boolean): BurstMark[] {
  const marks: BurstMark[] = [];
  const sparkles = Math.round(shape.count * 0.32);
  const flecks = Math.round(shape.count * 0.4);
  const trailed = first ? 6 : 0;
  for (let index = 0; index < sparkles + flecks; index += 1) {
    const sparkle = index < sparkles;
    const thrown = launch(shape, next, 0.92);
    const size = sparkle ? between(next, 11, 22) : between(next, 3, 5.5);
    const mark: BurstMark = {
      ...STILL,
      id: marks.length,
      shape: sparkle ? 'sparkle' : 'fleck',
      color: GOLD[index % GOLD.length] ?? GOLD[0],
      width: size,
      height: size,
      ...thrown,
      life: between(next, 2050, 2380),
      drag: between(next, 3.1, 3.8),
      gravity: between(next, 22, 55),
      rotation: next() * 0.6,
      spin: sparkle ? (next() - 0.5) * 1.6 : 0,
      sway: between(next, 5, 13),
      swayRate: between(next, 1.6, 2.8),
      phase: next() * Math.PI * 2,
      twinkle: between(next, 7, 13),
      fadeFrom: 0.6,
    };
    marks.push(mark);
    // The first few sparkles leave a trail: smaller flecks along the same path, a moment behind,
    // gone once the sparkle has slowed.
    if (sparkle && index < trailed) {
      for (let behind = 1; behind <= 3; behind += 1) {
        marks.push({
          ...mark,
          id: marks.length,
          shape: 'fleck',
          color: GOLD[(index + behind) % GOLD.length] ?? GOLD[0],
          width: 5.5 - behind,
          height: 5.5 - behind,
          delay: mark.delay + behind * 38,
          life: 760 - behind * 90,
          twinkle: 0,
          opacity: 0.85 - behind * 0.18,
          fadeFrom: 0.35,
        });
      }
    }
  }
  return marks;
}

/**
 * Soap bubbles: blown out wobbling, they rise and sway with a rainbow at the rim, and each pops in
 * its own time; some throw tiny droplets as they go.
 */
export function bubbles(shape: Throw, next: Next, inks: BurstInks): BurstMark[] {
  const marks: BurstMark[] = [];
  const count = Math.round(shape.count * 0.4);
  const rim = inks.dark ? 'rgba(255,255,255,0.7)' : 'rgba(110,160,220,0.7)';
  for (let index = 0; index < count; index += 1) {
    const thrown = launch(shape, next, 0.62);
    const size = index % 5 === 2 ? between(next, 34, 44) : between(next, 14, 30);
    const life = between(next, 1900, 2380);
    const popAt = life * between(next, 0.5, 0.92);
    const bubble: BurstMark = {
      ...STILL,
      id: marks.length,
      shape: 'bubble',
      color: rim,
      width: size,
      height: size,
      ...thrown,
      life,
      drag: between(next, 2.6, 3.2),
      gravity: -between(next, 60, 110),
      sway: between(next, 10, 20),
      swayRate: between(next, 2.4, 3.6),
      phase: next() * Math.PI * 2,
      wobble: between(next, 9, 14),
      popAt,
      fadeFrom: 1,
    };
    marks.push(bubble);
    if (index % 2 === 0) {
      for (let drop = 0; drop < 3; drop += 1) {
        const angle = next() * Math.PI * 2;
        const speed = between(next, 140, 260);
        const dropSize = between(next, 2.5, 4);
        marks.push({
          ...bubble,
          id: marks.length,
          shape: 'droplet',
          color: inks.dark ? 'rgba(220,238,255,0.9)' : 'rgba(110,160,220,0.85)',
          width: dropSize,
          height: dropSize,
          popAt: null,
          wobble: 0,
          life: popAt + 420,
          fling: { at: popAt, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed },
          fadeFrom: 0,
        });
      }
    }
  }
  return marks;
}

/**
 * An ink splat: blots fly out stretched, land with a squash and a wobble, sit on the page a
 * moment as the ink spreads, and fade. Tiny droplets go further than the blots.
 */
export function splat(shape: Throw, next: Next, inks: BurstInks, first: boolean): BurstMark[] {
  const marks: BurstMark[] = [];
  const count = Math.round(shape.count * 0.35);
  // All round but straight down, where a blot would land under the thumb.
  const thrown: Throw = { ...shape, spread: first ? 2 : ALL_ROUND, speed: [480, 1450] };
  for (let index = 0; index < count; index += 1) {
    const flight = launch(thrown, next, first ? 1 : 0.7);
    const size = index % 6 === 0 ? between(next, 19, 25) : between(next, 8, 16);
    const blot: BurstMark = {
      ...STILL,
      id: marks.length,
      shape: 'blot',
      color: index % 4 === 1 ? inks.tomato : inks.ink,
      width: size,
      height: size * between(next, 0.82, 1),
      ...flight,
      delay: shape.delay + next() * 40,
      life: between(next, 2000, 2350),
      drag: between(next, 6.5, 8),
      gravity: 0,
      rotation: next() * Math.PI * 2,
      lands: true,
      fadeFrom: 0.62,
    };
    marks.push(blot);
    if (first) {
      for (let drop = 0; drop < 2; drop += 1) {
        const spread = (next() - 0.5) * 0.5;
        const angle = Math.atan2(blot.vy, blot.vx) + spread;
        const speed = Math.hypot(blot.vx, blot.vy) * between(next, 1.1, 1.35);
        const dropSize = between(next, 2.5, 5);
        marks.push({
          ...blot,
          id: marks.length,
          shape: 'droplet',
          color: blot.color,
          width: dropSize,
          height: dropSize,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          drag: between(next, 5.5, 6.5),
          lands: false,
          life: blot.life - between(next, 200, 500),
        });
      }
    }
  }
  return marks;
}
