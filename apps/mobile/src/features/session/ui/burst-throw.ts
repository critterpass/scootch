import type { Throw } from './burst-shapes';

/** All the way round, as a throw's spread. */
export const ALL_ROUND = Math.PI;

/** The same marks every time: a burst is a drawing, not a roll of the dice. */
export function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

export type Next = () => number;

export const between = (next: Next, low: number, high: number) => low + next() * (high - low);

/** A colour part of the way from one to another, both as `#RRGGBB`. */
export function mix(from: string, to: string, share: number): string {
  const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);
  const out = [1, 3, 5].map((at) => {
    const value = Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * share);
    return value.toString(16).padStart(2, '0');
  });
  return `#${out.join('')}`;
}

/** Where a throw sends each mark: its direction and speed, and when it leaves. */
export function launch(shape: Throw, next: Next, speedShare = 1) {
  const angle = shape.aim + (next() * 2 - 1) * shape.spread;
  // Squared, so most marks go at an easy speed and a few go far.
  const reach = next();
  const speed = (shape.speed[0] + (shape.speed[1] - shape.speed[0]) * reach * reach) * speedShare;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    delay: shape.delay + next() * 70,
  };
}

export const STILL = {
  rotation: 0,
  spin: 0,
  flip: 0,
  flipAxis: 'x',
  sway: 0,
  swayRate: 0,
  phase: 0,
  scale: 1,
  opacity: 1,
  twinkle: 0,
  wobble: 0,
  popAt: null,
  fling: null,
  lands: false,
  fadeFrom: 0.72,
} as const;
