import { HOUR_MS, MINUTE_MS, type Instant } from '../day/local-time';

/**
 * A session as the Lock Screen and the Island follow it. It is written to the App Group, where the
 * Swift intents move it with the app closed (`targets/_shared/HuntRecord.swift` holds the same
 * fields and the same rules), and the app adopts it when it next opens. Times are milliseconds
 * since 1970.
 */
export interface HuntRecord {
  readonly taskId: string;
  /** When the count-in began. */
  readonly startedAt: Instant;
  /** When the clock starts: `startedAt` for a session begun in the app, a count-in later outside it. */
  readonly beginsAt: Instant;
  /** When the time is up. A pause moves it on by the length of the pause when the clock resumes. */
  readonly endsAt: Instant;
  /** Set while "I'm stuck" holds the clock. */
  readonly pausedAt: Instant | null;
  /** The last thought parked, and its words for the receipt. */
  readonly parkedAt: Instant | null;
  readonly parkedText: string | null;
  /** Set by the real catch, never by the clock. */
  readonly caughtAt: Instant | null;
  /** Set when the session was ended before its time. */
  readonly stoppedAt: Instant | null;
}

export type HuntPhase =
  | 'starting'
  | 'running'
  | 'parked'
  | 'stuck'
  | 'last_minutes'
  | 'overtime'
  | 'caught'
  | 'caught_collapsed'
  | 'stopped_early';

/** The count-in before a session begun outside the app, which "Not yet" cancels. */
export const HUNT_COUNT_IN_MS = 3_000;
/** How long the parked receipt shows. The clock never stops for it. */
export const HUNT_PARKED_RECEIPT_MS = 4_000;
export const HUNT_LAST_MINUTES_MS = 2 * MINUTE_MS;
/** How long the caught card stays whole before it folds to one line. */
export const HUNT_CAUGHT_CARD_MS = 8 * MINUTE_MS;
/** What "5 more" adds, counted from the moment it is asked for. */
export const HUNT_MORE_MS = 5 * MINUTE_MS;
/** The monster at the end of the race is a crumb, not nothing. */
export const HUNT_SMALLEST_MONSTER = 0.25;

export interface HuntView {
  readonly phase: HuntPhase;
  /** Whole seconds still to count in; 0 once the clock runs. */
  readonly countIn: number;
  /** Time left on the clock, frozen while stuck; 0 in overtime. */
  readonly remainingMs: number;
  /** Time past the end; 0 until then. */
  readonly overMs: number;
  /** How far Scootch has run toward the monster, 0 to 1. */
  readonly progress: number;
  /** The monster's size, 1 down to `HUNT_SMALLEST_MONSTER`. */
  readonly monsterScale: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** The instant the clock reads at: frozen at the pause or the stop, otherwise now. */
function clockAt(record: HuntRecord, now: Instant): Instant {
  return record.stoppedAt ?? record.caughtAt ?? record.pausedAt ?? now;
}

/** The top of the hour after `at`, when a folded caught card leaves. */
function nextHour(at: Instant): Instant {
  return (Math.floor(at / HOUR_MS) + 1) * HOUR_MS;
}

function phaseAt(record: HuntRecord, now: Instant): HuntPhase | null {
  if (record.caughtAt !== null) {
    if (now < record.caughtAt + HUNT_CAUGHT_CARD_MS) return 'caught';
    const leaves = nextHour(record.caughtAt + HUNT_CAUGHT_CARD_MS);
    return now < leaves ? 'caught_collapsed' : null;
  }
  if (record.stoppedAt !== null) return 'stopped_early';
  if (now < record.beginsAt) return 'starting';
  if (record.pausedAt !== null) return 'stuck';
  if (now >= record.endsAt) return 'overtime';
  if (record.parkedAt !== null && now - record.parkedAt < HUNT_PARKED_RECEIPT_MS) return 'parked';
  return record.endsAt - now <= HUNT_LAST_MINUTES_MS ? 'last_minutes' : 'running';
}

/**
 * What the Live Activity shows for a record at `now`, or `null` once there is nothing left to
 * show. Time running out is overtime: only the catch itself makes a hunt caught.
 */
export function huntView(record: HuntRecord, now: Instant): HuntView | null {
  const phase = phaseAt(record, now);
  if (phase === null) return null;
  const at = Math.max(record.beginsAt, clockAt(record, now));
  const total = Math.max(1, record.endsAt - record.beginsAt);
  const progress =
    phase === 'caught' || phase === 'caught_collapsed'
      ? 1
      : clamp01((at - record.beginsAt) / total);
  return {
    phase,
    countIn: phase === 'starting' ? Math.ceil((record.beginsAt - now) / 1000) : 0,
    remainingMs: Math.max(0, record.endsAt - at),
    overMs: phase === 'overtime' ? now - record.endsAt : 0,
    progress,
    monsterScale: 1 - (1 - HUNT_SMALLEST_MONSTER) * progress,
  };
}

/** A hunt begun outside the app: three seconds to change your mind, then the clock. */
export function beginHunt(taskId: string, minutes: number, now: Instant): HuntRecord {
  const beginsAt = now + HUNT_COUNT_IN_MS;
  return {
    taskId,
    startedAt: now,
    beginsAt,
    endsAt: beginsAt + minutes * MINUTE_MS,
    pausedAt: null,
    parkedAt: null,
    parkedText: null,
    caughtAt: null,
    stoppedAt: null,
  };
}

function over(record: HuntRecord): boolean {
  return record.caughtAt !== null || record.stoppedAt !== null;
}

/** "I'm stuck": the clock holds. Nothing to hold before it runs, after it is up or once it is over. */
export function pauseHunt(record: HuntRecord, now: Instant): HuntRecord {
  if (over(record) || record.pausedAt !== null) return record;
  if (now < record.beginsAt || now >= record.endsAt) return record;
  return { ...record, pausedAt: now };
}

/** The clock runs again, with every minute it had when it was held. */
export function resumeHunt(record: HuntRecord, now: Instant): HuntRecord {
  if (over(record) || record.pausedAt === null) return record;
  const held = Math.max(0, now - record.pausedAt);
  return { ...record, pausedAt: null, endsAt: record.endsAt + held };
}

/** A thought was parked: the receipt shows and the clock is untouched. */
export function parkInHunt(record: HuntRecord, text: string | null, now: Instant): HuntRecord {
  if (over(record)) return record;
  return { ...record, parkedAt: now, parkedText: text };
}

/** "5 more", asked for in overtime: five minutes from now. */
export function moreHunt(record: HuntRecord, now: Instant): HuntRecord {
  if (over(record) || now < record.endsAt) return record;
  return { ...record, endsAt: now + HUNT_MORE_MS };
}

/** Ended before its time. During the count-in this is "Not yet" and leaves nothing to show. */
export function stopHunt(record: HuntRecord, now: Instant): HuntRecord | null {
  if (over(record)) return record;
  if (now < record.beginsAt) return null;
  return { ...record, pausedAt: null, stoppedAt: record.pausedAt ?? now };
}

/** The real catch happened. */
export function catchHunt(record: HuntRecord, now: Instant): HuntRecord {
  if (over(record)) return record;
  return { ...record, pausedAt: null, caughtAt: now };
}
