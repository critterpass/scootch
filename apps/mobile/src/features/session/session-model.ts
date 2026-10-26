import { MINUTE_MS } from '@phusclass/domain/board';

import type { BoardSnapshot } from '../../state/board-view';

/** `m:ss`, never below zero. */
export function clockText(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export interface SessionClock {
  /** `m:ss` left. */
  readonly left: string;
  readonly leftMs: number;
  /** 0 to 1 of the period gone. */
  readonly gone: number;
  readonly minutes: number;
  /** The drum has sounded: "Done?" */
  readonly timeUp: boolean;
  /** The first period on it began inside the fuse. */
  readonly inTime: boolean;
  /** Whole minutes since the drum, for "Took 11 minutes". */
  readonly tookMinutes: number;
}

/**
 * The period on the desk as the screen shows it, read from the store: the start instant is kept
 * in SQLite, so the time left is the same after the phone was locked, the app was in the
 * background or it was closed and opened again.
 */
export function sessionClock(snapshot: BoardSnapshot): SessionClock | null {
  const session = snapshot.session;
  if (session === null) return null;
  const total = session.minutes * MINUTE_MS;
  return {
    left: clockText(session.leftMs),
    leftMs: session.leftMs,
    gone: total <= 0 ? 1 : Math.min(1, Math.max(0, 1 - session.leftMs / total)),
    minutes: session.minutes,
    timeUp: session.leftMs <= 0,
    inTime: snapshot.desk?.task.desk?.insideFuse === true,
    tookMinutes: Math.max(1, Math.round((snapshot.now.at - session.startedAt) / MINUTE_MS)),
  };
}
