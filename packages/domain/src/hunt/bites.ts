/** A monster comes in this many bites. */
export const BITE_COUNT = 3;
/** However many bites are gone, what is left of a monster is still a crumb. */
export const BITTEN_SMALLEST = 0.25;

/** The share of its size a monster keeps after this many of its bites are gone. */
export function bittenScale(caught: number): number {
  const gone = Math.min(Math.max(0, Math.trunc(caught)), BITE_COUNT);
  return Math.max(BITTEN_SMALLEST, 1 - gone / BITE_COUNT);
}

export interface BiteTick {
  /** The bites gone, in the order of their places. */
  readonly caught: number[];
  /** True when this tick took the last one: the catch is next, and it happens in the app. */
  readonly last: boolean;
}

/**
 * Ticks the bite at `place`. `null` when there is nothing to tick: no such bite, or it is gone
 * already. A bite is never un-ticked, and ticking earns nothing.
 */
export function tickBite(caught: readonly number[], place: number): BiteTick | null {
  if (!Number.isInteger(place) || place < 0 || place >= BITE_COUNT) return null;
  if (caught.includes(place)) return null;
  const next = [...new Set([...caught, place])].sort((a, b) => a - b);
  return { caught: next, last: next.length === BITE_COUNT };
}
