import type { SurfaceTimetable } from './surface-snapshot';

/**
 * What other features hand the surfaces that the board store does not hold: the line the session
 * screen is saying, whether tuition is paid, and the timetable. Each lane sets its own; the
 * surfaces read them on the next sync.
 */
export interface SurfaceInputs {
  /** The line of the running period, for the Live Activity. Empty when he says nothing. */
  readonly periodLine: string;
  readonly enrolled: boolean;
  readonly timetable: SurfaceTimetable | null;
  /** The quiet of the night in minutes after midnight; `null` keeps 22:00 to 7:00. */
  readonly night: { readonly start: number; readonly end: number } | null;
}

let inputs: SurfaceInputs = { periodLine: '', enrolled: false, timetable: null, night: null };
const listeners = new Set<() => void>();

function change(patch: Partial<SurfaceInputs>): void {
  const next = { ...inputs, ...patch };
  if ((Object.keys(patch) as (keyof SurfaceInputs)[]).every((key) => next[key] === inputs[key])) {
    return;
  }
  inputs = next;
  for (const listener of listeners) listener();
}

export const surfaceInputs = {
  get: (): SurfaceInputs => inputs,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** The session screen's line for the period on the Live Activity. */
export function setPeriodLine(line: string): void {
  change({ periodLine: line });
}

/** Tuition paid or not: the tuition widgets open, or show their quiet lock. */
export function setSurfaceTuition(enrolled: boolean): void {
  change({ enrolled });
}

/** Today's timetable for the timetable widget and the next-period accessory. */
export function setSurfaceTimetable(timetable: SurfaceTimetable | null): void {
  change({ timetable });
}

/** The quiet hours, for the night on the small widget and StandBy. */
export function setSurfaceNight(night: SurfaceInputs['night']): void {
  change({ night });
}
