import { createRng, type Rng, rngIndex, rngPick } from '../core/prng';

/** The band, in weekday order from Monday: each finished day brings its own instrument. */
export const RECORD_INSTRUMENTS = [
  'keys',
  'bassline',
  'marimba',
  'drums',
  'whistle',
  'bells',
  'choir',
] as const;
export type RecordInstrument = (typeof RECORD_INSTRUMENTS)[number];

export interface FinishedDay {
  /** 0 is Monday, 6 is Sunday. */
  readonly weekday: number;
  /** The seed of the monster caught that day. */
  readonly seed: string;
}

/** One note of a bar. A bar has 16 steps; what `part` means depends on the instrument. */
export interface BarNote {
  readonly step: number;
  readonly part: number;
}

/** One day's bar: what that day's instrument plays, written relative to the chord so it fits any bar of the track. */
export interface Bar {
  readonly weekday: number;
  readonly instrument: RecordInstrument;
  readonly seed: string;
  readonly notes: readonly BarNote[];
}

export const STEPS_PER_BAR = 16;
export const DRUM = { kick: 0, snare: 1, hat: 2 } as const;

type Rhythms = readonly [readonly number[], ...(readonly number[])[]];
type Writer = (rng: Rng) => BarNote[];

const parts = (steps: readonly number[], part: (step: number, i: number) => number): BarNote[] =>
  steps.map((step, i) => ({ step, part: part(step, i) }));

/** Each instrument keeps the shape the record was designed with; the seed picks its rhythm and its notes. */
const WRITERS: Record<RecordInstrument, Writer> = {
  // Chord stabs; `part` is the inversion.
  keys(rng) {
    const rhythms: Rhythms = [
      [0, 6, 10],
      [0, 6, 12],
      [0, 4, 10],
      [0, 3, 6, 10],
      [0, 6, 10, 14],
    ];
    return parts(rngPick(rng, rhythms), () => rngIndex(rng, 3));
  },
  // `part`: 0 the root, 1 the fifth above, 2 the octave above. The bar always lands on the root first.
  bassline(rng) {
    const rhythms: Rhythms = [
      [0, 3, 8, 11],
      [0, 3, 8, 14],
      [0, 6, 8, 11],
      [0, 3, 6, 8, 11],
      [0, 8, 11, 14],
    ];
    return parts(rngPick(rng, rhythms), (_, i) => {
      const roll = rng();
      return i === 0 || roll < 0.7 ? 0 : roll < 0.9 ? 1 : 2;
    });
  },
  // An arpeggio on the off-steps; `part` is which chord note.
  marimba(rng) {
    const orders: Rhythms = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    const order = rngPick(rng, orders);
    const steps = [1, 3, 5, 7, 9, 11, 13, 15].filter((_, i) => i === 0 || rng() > 0.15);
    return parts(steps, (step) => order[((step - 1) / 2) % 3] ?? 0);
  },
  // `part` is the drum.
  drums(rng) {
    const extraKicks: Rhythms = [[], [10], [7], [14], [3]];
    const ghostSnares: Rhythms = [[], [15], [11], [7]];
    const hats: Rhythms = [
      [0, 2, 4, 6, 8, 10, 12, 14],
      [0, 2, 4, 6, 8, 10, 12, 13, 14, 15],
      [0, 2, 4, 6, 8, 10, 12, 14, 15],
      [0, 2, 6, 8, 10, 14],
    ];
    return [
      ...parts([0, 8, ...rngPick(rng, extraKicks)], () => DRUM.kick),
      ...parts([4, 12, ...rngPick(rng, ghostSnares)], () => DRUM.snare),
      ...parts(rngPick(rng, hats), () => DRUM.hat),
    ];
  },
  // A tune that wanders the scale by small steps; `part` is the scale degree.
  whistle(rng) {
    const rhythms: Rhythms = [
      [2, 6, 10, 14],
      [2, 6, 10],
      [2, 6, 12, 14],
      [2, 8, 10, 14],
    ];
    const moves: readonly [number, ...number[]] = [-2, -1, 1, 2];
    let degree = rngIndex(rng, 5);
    return parts(rngPick(rng, rhythms), () => {
      const now = degree;
      degree = (degree + rngPick(rng, moves) + 5) % 5;
      return now;
    });
  },
  // `part` is which chord note rings.
  bells(rng) {
    const rhythms: Rhythms = [
      [0, 8],
      [0, 10],
      [0, 6, 12],
      [4, 12],
    ];
    return parts(rngPick(rng, rhythms), () => rngIndex(rng, 3));
  },
  // One or two long swells; `part` is the voicing: close, with the root doubled above, or open.
  choir(rng) {
    const rhythms: Rhythms = [[0], [0], [0, 8]];
    const voicing = rngIndex(rng, 3);
    return parts(rngPick(rng, rhythms), () => voicing);
  },
};

/**
 * The bar a finished day adds to the week's record: that weekday's instrument, playing a pattern
 * drawn from the seed of the day's monster. The same day always gives the same bar.
 */
export function composeBar(day: FinishedDay): Bar {
  const weekday = ((Math.trunc(day.weekday) % 7) + 7) % 7;
  const instrument = RECORD_INSTRUMENTS[weekday] ?? 'keys';
  const notes = WRITERS[instrument](createRng(`${day.seed}::${instrument}`));
  return { weekday, instrument, seed: day.seed, notes };
}
