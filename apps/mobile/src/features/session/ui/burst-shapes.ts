import type { TrailId } from '../../studio/catalogue';

/** How long the marks are in the air, at the longest: the last throw's wait and its longest flight. */
export const BURST_MS = 1850;
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
  /** What the mark is made of: cut paper, a fleck of gold, a soap bubble or a blot of ink. */
  readonly made: 'paper' | 'gold' | 'bubble' | 'blot';
}

/** One throw of a burst: where it opens, as shares of the screen, with its marks and rings. */
export interface BurstSource {
  readonly id: number;
  readonly at: readonly [number, number];
  /** Thrown from the control that set it off, when the screen knows where that is. */
  readonly fromControl: boolean;
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
  /** Where the rings begin: just outside the control they come from. 20 when left out. */
  readonly ringFrom?: number;
  /** True for the throw that comes from the pressed control; `at` is then only where it is expected. */
  readonly fromControl?: boolean;
  /** How long after the burst begins this throw goes. */
  readonly delay: number;
  readonly at: readonly [number, number];
}

/** Where the Start button was a moment ago: 72 points above the foot of the board's 852-point phone. */
const FROM_THE_BUTTON = [0.5, 0.915] as const;
const UP_THE_SCREEN = [0.5, 0.3] as const;
const MIDDLE = [0.5, 0.36] as const;

/** Where the finish control sits when the screen has not said. */
const THE_FINISH_CONTROL = [0.5, 0.8] as const;

const SHAPES: Record<'start' | 'confetti' | 'catch', readonly Throw[]> = {
  // The catch, as the board fires it when the hold completes: 80 marks and three rings from the
  // finish button, starting at its ring, then 40 more with one ring from up the screen.
  catch: [
    {
      count: 80,
      speed: 420,
      lift: 220,
      rings: [0, 80, 160],
      ringTo: 120,
      ringFrom: 62,
      fromControl: true,
      delay: 0,
      at: THE_FINISH_CONTROL,
    },
    { count: 40, speed: 300, lift: 60, rings: [120], ringTo: 210, delay: 160, at: UP_THE_SCREEN },
  ],
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
      made: 'paper',
    };
  });
}

/**
 * The same throw in another trail. Where a mark flies does not change, so a trail is a dressing
 * and never a different burst: only what it is made of, how big it is and how it falls.
 */
function dressed(mark: BurstMark, trail: TrailId): BurstMark {
  const step = mark.id % 7;
  switch (trail) {
    case 'confetti':
      return mark;
    case 'stardust': {
      // Gold flecks that hang in the air a beat too long.
      const size = 4 + step;
      return {
        ...mark,
        made: 'gold',
        color: '#FFC94A',
        width: size,
        height: size,
        gravity: 60,
        life: mark.life * 1.35,
      };
    }
    case 'bubbles': {
      // Soap bubbles rise.
      const size = 12 + step * 3;
      return {
        ...mark,
        made: 'bubble',
        color: 'rgba(190,225,255,0.3)',
        width: size,
        height: size,
        gravity: -150,
      };
    }
    case 'splat': {
      // A blot lands where it was thrown and stays there until it fades.
      const size = 6 + step * 3;
      return {
        ...mark,
        made: 'blot',
        color: '#1C1A17',
        width: size,
        height: size * (mark.id % 2 ? 1 : 0.86),
        gravity: 0,
        spin: 0,
      };
    }
  }
}

function ringsOf(shape: Throw, colors: readonly string[]): BurstRing[] {
  return shape.rings.map((delay, id) => ({
    id,
    from: shape.ringFrom ?? 20,
    to: shape.ringTo + id * 50,
    delay: shape.delay + delay,
    life: 700,
    color: colors[id % colors.length] ?? '#000000',
  }));
}

/**
 * A burst as its throws, each from its own point. `markColors` cycle through the marks and
 * `ringColors` through each throw's rings. The trail dresses a catch and a finish; the start of
 * a session is always paper.
 */
export function burstSources(
  kind: keyof typeof SHAPES,
  markColors: readonly string[],
  ringColors: readonly string[],
  trail: TrailId = 'confetti',
): BurstSource[] {
  const worn = kind === 'start' ? 'confetti' : trail;
  const next = sequence(kind === 'start' ? 11 : kind === 'catch' ? 37 : 23);
  return SHAPES[kind].map((shape, id) => ({
    id,
    at: shape.at,
    fromControl: shape.fromControl === true,
    marks: marksOf(shape, next, markColors).map((mark) => dressed(mark, worn)),
    rings: ringsOf(shape, ringColors),
  }));
}
