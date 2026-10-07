import { eventStart, lid, seeded } from './loop-math';

/** A monster's idle. Everything rests at zero. */
export interface MonsterIdleMotion {
  /** Lift off its spot, in drawing units; negative is up. */
  readonly bob: number;
  /** Lean about its feet, in radians. */
  readonly sway: number;
  /** 0 eyes open, 1 shut. */
  readonly blink: number;
}

/** The design bobs a standing monster two units with sin(2t), a hovering one four with sin(1.8t). */
const STAND = { rate: 2, reach: 2 } as const;
const HOVER = { rate: 1.8, reach: 4 } as const;
/** The design's slow look from side to side, sin(0.7t), used here for the lean. */
const SWAY_RATE = 0.7;
export const MONSTER_SWAY_RADIANS = 0.035;
const BLINK_EVERY_S = 4.3;
const BLINK_SPREAD_S = 1.4;
const BLINK_LENGTH_S = 0.14;

/** The design hops a legless sock or note seven units with |sin(3t)|. */
const HOP = { rate: 3, reach: 7 } as const;

const paceOf = (seed: string): number => 0.8 + seeded(seed, 31) * 0.2;

/** The lift of a hopping monster at `t` seconds, in drawing units: zero on the ground, negative up. */
export function monsterHop(t: number, seed: string): number {
  return -Math.abs(Math.sin(t * HOP.rate * paceOf(seed))) * HOP.reach;
}

/**
 * A monster's idle at `t` seconds: a small bob, a slow sway and a blink at uneven intervals. The
 * seed makes each monster a little slower or quicker than the next (never quicker than the
 * design), so a row of them does not move as one. At zero everything rests.
 */
export function monsterIdle(t: number, seed: string, hover = false): MonsterIdleMotion {
  const pace = paceOf(seed);
  const { rate, reach } = hover ? HOVER : STAND;
  const nearest = Math.round(t / BLINK_EVERY_S);
  let blink = 0;
  for (let index = Math.max(1, nearest - 1); index <= nearest + 1; index++) {
    const start = eventStart(seed, 32, index, BLINK_EVERY_S, BLINK_SPREAD_S);
    blink = Math.max(blink, lid(t - start, BLINK_LENGTH_S));
  }
  return {
    bob: Math.sin(t * rate * pace) * reach,
    sway: Math.sin(t * SWAY_RATE * pace) * MONSTER_SWAY_RADIANS,
    blink,
  };
}
