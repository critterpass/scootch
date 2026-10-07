/** How long the marks are in the air, at the longest: the last throw's wait and its longest flight. */
export const BURST_MS = 1800;
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

/** One throw of a burst: where it opens, as shares of the screen, with its marks and rings. */
export interface BurstSource {
  readonly id: number;
  readonly at: readonly [number, number];
  readonly marks: readonly BurstMark[];
  readonly rings: readonly BurstRing[];
}

export interface BurstRing {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly delay: number;
  readonly life: number;
  readonly color: string;
}

interface Throw {
  readonly count: number;
  readonly speed: number;
  readonly lift: number;
  /** When each ring sets off, in milliseconds after the throw. */
  readonly rings: readonly number[];
  readonly ringTo: number;
  /** How long after the burst begins this throw goes. */
  readonly delay: number;
  readonly at: readonly [number, number];
}

/** Where the Start button was a moment ago: 72 points above the foot of the board's 852-point phone. */
const FROM_THE_BUTTON = [0.5, 0.915] as const;
const UP_THE_SCREEN = [0.5, 0.3] as const;
const MIDDLE = [0.5, 0.36] as const;

const SHAPES: Record<'start' | 'confetti', readonly Throw[]> = {
  // The start, as the board fires it: 56 marks and two rings from the Start button, thrown high,
  // then 34 more with one ring from up the screen, 90 ms later.
  start: [
    {
      count: 56,
      speed: 340,
      lift: 200,
      rings: [0, 90],
      ringTo: 150,
      delay: 0,
      at: FROM_THE_BUTTON,
    },
    { count: 34, speed: 260, lift: 40, rings: [40], ringTo: 190, delay: 90, at: UP_THE_SCREEN },
  ],
  // The finish: further, with a third ring.
  confetti: [
    { count: 40, speed: 420, lift: 220, rings: [0, 80, 160], ringTo: 120, delay: 0, at: MIDDLE },
  ],
};

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
function marksOf(shape: Throw, next: () => number, colors: readonly string[]): BurstMark[] {
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
      delay: shape.delay + next() * 60,
      life: 900 + next() * 700,
      color: colors[id % colors.length] ?? '#000000',
      width: bar ? 9 + next() * 9 : dot,
      height: bar ? 4.4 : dot,
      rotation: next() * 6,
      spin: (next() - 0.5) * 10,
    };
  });
}

function ringsOf(shape: Throw, colors: readonly string[]): BurstRing[] {
  return shape.rings.map((delay, id) => ({
    id,
    from: 20,
    to: shape.ringTo + id * 50,
    delay: shape.delay + delay,
    life: 700,
    color: colors[id % colors.length] ?? '#000000',
  }));
}

/**
 * A burst as its throws, each from its own point. `markColors` cycle through the marks and
 * `ringColors` through each throw's rings.
 */
export function burstSources(
  kind: keyof typeof SHAPES,
  markColors: readonly string[],
  ringColors: readonly string[],
): BurstSource[] {
  const next = sequence(kind === 'start' ? 11 : 23);
  return SHAPES[kind].map((shape, id) => ({
    id,
    at: shape.at,
    marks: marksOf(shape, next, markColors),
    rings: ringsOf(shape, ringColors),
  }));
}
