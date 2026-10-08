import type { TaskRow } from '../contracts';

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

/** One bite as a sitting shows it. The user's own line has no minutes: nobody timed it. */
export interface SittingBite {
  readonly text: string;
  readonly minutes: number | null;
  /** True for the line the user left for this sitting, shown word for word. */
  readonly own: boolean;
}

/**
 * The bites of a task's next sitting, in order. A line the user left for it is the first bite, in
 * place of the written one; the written second and third follow. With no written bites the line
 * is the only one, and with neither there are none.
 */
export function sittingBites(task: Pick<TaskRow, 'lines' | 'nextStart'>): SittingBite[] {
  const written = task.lines !== null && 'bites' in task.lines ? (task.lines.bites ?? []) : [];
  const bites: SittingBite[] = written.map((bite) => ({ ...bite, own: false }));
  if (task.nextStart == null) return bites;
  return [{ text: task.nextStart.text, minutes: null, own: true }, ...bites.slice(1)];
}

/** Where a sitting starts: the user's own line when they left one, else the first written bite. */
export function firstBite(task: Pick<TaskRow, 'lines' | 'nextStart'>): SittingBite | null {
  return sittingBites(task)[0] ?? null;
}
