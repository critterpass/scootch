import { createContext, useContext } from 'react';
import { makeMutable, type SharedValue } from 'react-native-reanimated';

/** The three tabs of the keeping place, in the order they sit at the foot. */
export const KEEP_TABS = ['world', 'caught', 'song'] as const;
export type KeepTab = (typeof KEEP_TABS)[number];
export const WORLD = 0;
export const CAUGHT = 1;
export const SONG = 2;

/** One move between two tabs: the boards' curve, fast out and a long soft landing. */
export const TAB_MS = 640;

/** Where the island's sand lies under a tab's heading, in points: what the record rises out of. */
export interface Sand {
  /** From the top of the tab's own room down to the sand's middle. */
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

export interface KeepMotion {
  /** The tab being left and the tab arrived at, as places in `KEEP_TABS`. Equal at rest. */
  readonly from: SharedValue<number>;
  readonly to: SharedValue<number>;
  /** How far the move has got, 0 to 1. One at rest. */
  readonly progress: SharedValue<number>;
  /** The sand as the world last drew it; `null` before it has. */
  readonly sand: SharedValue<Sand | null>;
  /** True where nothing may move: a tab then simply fades in. */
  readonly calm: boolean;
  /** The room at the foot of every tab that the tab bar floats over. */
  readonly barSpace: number;
}

export const KeepMotionContext = createContext<KeepMotion | null>(null);

// A tab drawn by itself (a capture, a test) is at rest: wholly there, with nothing to rise out
// of. Made the first time one is drawn so, and shared by every part of it.
let atRest: KeepMotion | undefined;

/** The move a tab is part of, or rest for a tab drawn outside the keeping place. */
export function useKeepMotion(): KeepMotion {
  const given = useContext(KeepMotionContext);
  if (given) return given;
  atRest ??= {
    from: makeMutable(0),
    to: makeMutable(0),
    progress: makeMutable(1),
    sand: makeMutable<Sand | null>(null),
    calm: true,
    barSpace: 0,
  };
  return atRest;
}

/**
 * How much of a tab is there, 0 to 1, and which tab it is trading places with (or -1). Arriving
 * and leaving are one movement run forwards and backwards, so a tab only ever describes how it
 * looks part way in.
 */
export function presence(
  from: number,
  to: number,
  progress: number,
  me: number,
): { v: number; other: number } {
  'worklet';
  if (to === me) return { v: progress, other: from === me ? -1 : from };
  if (from === me) return { v: 1 - progress, other: to };
  return { v: 0, other: -1 };
}

export function mix(from: number, to: number, k: number): number {
  'worklet';
  return from + (to - from) * k;
}

/** 0 until `v` reaches `start`, 1 from `end`, and a straight line between. */
export function ramp(v: number, start: number, end: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (v - start) / (end - start)));
}
