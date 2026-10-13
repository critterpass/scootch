import type { TrailId } from '../../studio/catalogue';

import { bubbles, splat, stardust } from './burst-dressed';
import { paper } from './burst-paper';
import { ALL_ROUND, sequence } from './burst-throw';

/** How long the marks are in the air, at the longest: every mark is gone by then. */
export const BURST_MS = 2500;
/** How long the start burst holds the screen before it goes quiet. */
export const BURST_HOLD_MS = 2600;

/** What a mark is cut from. Paper for the free trail; the rest belong to a paid one. */
export type MarkShape =
  | 'strip'
  | 'square'
  | 'dot'
  | 'curl'
  | 'zigzag'
  | 'star'
  | 'sparkle'
  | 'fleck'
  | 'bubble'
  | 'droplet'
  | 'blot';

/**
 * One mark and how it moves. A mark is thrown at a speed that the air takes off it (`drag`), and
 * then it falls (or rises) at the speed where gravity and the air agree. Times are milliseconds
 * from the start of the burst; speeds are points a second.
 */
export interface BurstMark {
  readonly id: number;
  readonly shape: MarkShape;
  readonly color: string;
  readonly width: number;
  readonly height: number;
  readonly delay: number;
  readonly life: number;
  readonly vx: number;
  readonly vy: number;
  /** How quickly the air slows it, each second. */
  readonly drag: number;
  /** Down is positive; a bubble's is negative and it rises. */
  readonly gravity: number;
  readonly rotation: number;
  /** Turns a second, in radians, about the screen's axis. */
  readonly spin: number;
  /** Paper tumbling over: radians a second about its own length, 0 for none. */
  readonly flip: number;
  readonly flipAxis: 'x' | 'y';
  /** The side-to-side drift once the throw is spent. */
  readonly sway: number;
  readonly swayRate: number;
  readonly phase: number;
  /** Nearer marks are a little larger. */
  readonly scale: number;
  readonly opacity: number;
  /** A sparkle's pulse, radians a second; 0 for none. */
  readonly twinkle: number;
  /** A bubble's wobble, radians a second; 0 for none. */
  readonly wobble: number;
  /** When a bubble pops, in milliseconds into its life. */
  readonly popAt: number | null;
  /** A droplet rides inside its bubble, unseen, until the bubble pops and flings it out. */
  readonly fling: { readonly at: number; readonly vx: number; readonly vy: number } | null;
  /** A blot stretches as it flies and squashes when it lands. */
  readonly lands: boolean;
  /** The share of its life after which it fades. */
  readonly fadeFrom: number;
}

/** The one soft flash where a throw goes off: a filled bloom, never an outline. */
export interface BurstBloom {
  readonly delay: number;
  readonly life: number;
  readonly size: number;
  readonly color: string;
  readonly peak: number;
}

/** One throw of a burst: where it opens, as shares of the screen, with its marks. */
export interface BurstSource {
  readonly id: number;
  readonly at: readonly [number, number];
  /** Thrown from the control that set it off, when the screen knows where that is. */
  readonly fromControl: boolean;
  readonly marks: readonly BurstMark[];
  readonly bloom: BurstBloom | null;
}

/** The colours a burst is printed in, from the session's inks. */
export interface BurstInks {
  readonly ink: string;
  readonly tomato: string;
  readonly page: string;
  readonly dark: boolean;
}

export interface Throw {
  /** How many paper marks the free trail throws; the paid trails count from it. */
  readonly count: number;
  /** Which way the throw points, in radians: up is -π/2. */
  readonly aim: number;
  /** How far either side of the aim it spreads; π is all the way round. */
  readonly spread: number;
  readonly speed: readonly [number, number];
  /** True for the throw that comes from the pressed control; `at` is then only where it is expected. */
  readonly fromControl?: boolean;
  /** How long after the burst begins this throw goes. */
  readonly delay: number;
  readonly at: readonly [number, number];
  /** Only the first throw flashes. */
  readonly bloom: boolean;
}

/** Where the Start button was a moment ago: 72 points above the foot of the board's 852-point phone. */
const FROM_THE_BUTTON = [0.5, 0.915] as const;
const UP_THE_SCREEN = [0.5, 0.3] as const;
const MIDDLE = [0.5, 0.36] as const;
/** Where the finish control sits when the screen has not said. */
const THE_FINISH_CONTROL = [0.5, 0.8] as const;

const UP = -Math.PI / 2;

const SHAPES: Record<'start' | 'confetti' | 'catch', readonly Throw[]> = {
  // A snappy cannon from the finish control, then a softer puff from up the screen.
  catch: [
    {
      count: 66,
      aim: UP,
      spread: 0.7,
      speed: [650, 1650],
      fromControl: true,
      delay: 0,
      at: THE_FINISH_CONTROL,
      bloom: true,
    },
    {
      count: 32,
      aim: UP,
      spread: ALL_ROUND,
      speed: [220, 640],
      delay: 150,
      at: UP_THE_SCREEN,
      bloom: false,
    },
  ],
  // The start: thrown high from the Start button, then a puff from up the screen.
  start: [
    {
      count: 54,
      aim: UP,
      spread: 0.5,
      speed: [760, 1750],
      delay: 0,
      at: FROM_THE_BUTTON,
      bloom: true,
    },
    {
      count: 28,
      aim: UP,
      spread: ALL_ROUND,
      speed: [220, 600],
      delay: 130,
      at: UP_THE_SCREEN,
      bloom: false,
    },
  ],
  // The finish: a pop in the middle, and a second, softer one just above it.
  confetti: [
    {
      count: 44,
      aim: UP,
      spread: ALL_ROUND,
      speed: [420, 1250],
      delay: 0,
      at: MIDDLE,
      bloom: true,
    },
    {
      count: 22,
      aim: UP,
      spread: ALL_ROUND,
      speed: [200, 560],
      delay: 140,
      at: [0.5, 0.3],
      bloom: false,
    },
  ],
};

function bloomOf(shape: Throw, trail: TrailId, inks: BurstInks): BurstBloom | null {
  if (!shape.bloom) return null;
  const color = {
    confetti: inks.tomato,
    stardust: '#FFC94A',
    bubbles: inks.dark ? '#BFE0FF' : '#8FC1F0',
    splat: inks.tomato,
  }[trail];
  return {
    delay: shape.delay,
    life: trail === 'stardust' ? 340 : 300,
    size: 220,
    color,
    peak: 0.5,
  };
}

/**
 * A burst as its throws, each from its own point, in the trail the person wears. The start of a
 * session is always paper; the trail dresses a catch and a finish.
 */
export function burstSources(
  kind: keyof typeof SHAPES,
  inks: BurstInks,
  trail: TrailId = 'confetti',
): BurstSource[] {
  const worn = kind === 'start' ? 'confetti' : trail;
  const next = sequence(kind === 'start' ? 11 : kind === 'catch' ? 37 : 23);
  return SHAPES[kind].map((shape, id) => {
    const first = id === 0;
    const marks = {
      confetti: () => paper(shape, next, inks),
      stardust: () => stardust(shape, next, first),
      bubbles: () => bubbles(shape, next, inks),
      splat: () => splat(shape, next, inks, first),
    }[worn]();
    return {
      id,
      at: shape.at,
      fromControl: shape.fromControl === true,
      marks: marks.map((mark) => ({
        ...mark,
        life: Math.min(mark.life, BURST_MS - mark.delay),
      })),
      bloom: bloomOf(shape, worn, inks),
    };
  });
}

/** The throw the still marks are cut from: only their looks are used. */
const STILL_THROW: Throw = {
  count: 30,
  aim: UP,
  spread: ALL_ROUND,
  speed: [0, 0],
  delay: 0,
  at: MIDDLE,
  bloom: false,
};

/** A few marks of the trail laid still, for when nothing may fly. Offsets are from the middle. */
export function stillMarks(
  inks: BurstInks,
  trail: TrailId,
): readonly { readonly mark: BurstMark; readonly x: number; readonly y: number }[] {
  const spots = [
    [-112, -96],
    [96, -120],
    [-60, -150],
    [138, -24],
    [-146, 6],
    [44, -64],
    [-30, 84],
    [118, 92],
    [-118, 120],
    [20, 150],
  ] as const;
  const shape: Throw = { ...STILL_THROW, count: 30 };
  const made = {
    confetti: () => paper(shape, sequence(5), inks),
    stardust: () => stardust(shape, sequence(5), false),
    bubbles: () => bubbles(shape, sequence(5), inks).filter((mark) => mark.shape === 'bubble'),
    splat: () => splat(shape, sequence(5), inks, false),
  }[trail]();
  return spots.flatMap(([x, y], index) => {
    const mark = made[index % made.length];
    return mark ? [{ mark, x, y }] : [];
  });
}
