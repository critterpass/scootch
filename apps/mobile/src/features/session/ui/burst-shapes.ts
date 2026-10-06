/** How long the marks are in the air, at the longest. */
export const BURST_MS = 1700;
/** How long the start burst holds the screen before it goes quiet. */
export const BURST_HOLD_MS = 2600;

export interface BurstMark {
  readonly id: number;
  /** Where it flies to, in points from the origin, before gravity. */
  readonly vx: number;
  readonly vy: number;
  readonly gravity: number;
  readonly delay: number;
  readonly life: number;
  readonly color: string;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly spin: number;
}

export interface BurstRing {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly delay: number;
  readonly life: number;
  readonly color: string;
}

const SHAPES = {
  // The start: a quick throw upwards. The finish: more of it, further, with a third ring.
  start: { count: 30, speed: 340, lift: 200, rings: [0, 90], ringTo: 150 },
  confetti: { count: 40, speed: 420, lift: 220, rings: [0, 80, 160], ringTo: 120 },
} as const;

/** The same marks every time: a burst is a drawing, not a roll of the dice. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** The flying marks: short rounded bars and dots, thrown in every direction and pulled down. */
export function burstMarks(kind: keyof typeof SHAPES, colors: readonly string[]): BurstMark[] {
  const shape = SHAPES[kind];
  const next = sequence(kind === 'start' ? 11 : 23);
  return Array.from({ length: shape.count }, (_, id) => {
    const angle = next() * Math.PI * 2;
    const speed = shape.speed * (0.4 + next() * 0.8);
    const bar = id % 2 === 0;
    const dot = (2.5 + next() * 2.5) * 2;
    return {
      id,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - shape.lift,
      gravity: 260,
      delay: next() * 60,
      life: 900 + next() * 700,
      color: colors[id % colors.length] ?? '#000000',
      width: bar ? 9 + next() * 9 : dot,
      height: bar ? 4.4 : dot,
      rotation: next() * 6,
      spin: (next() - 0.5) * 10,
    };
  });
}

export function burstRings(kind: keyof typeof SHAPES, colors: readonly string[]): BurstRing[] {
  const shape = SHAPES[kind];
  return shape.rings.map((delay, id) => ({
    id,
    from: 20,
    to: shape.ringTo + id * 50,
    delay,
    life: 700,
    color: colors[id % colors.length] ?? '#000000',
  }));
}
