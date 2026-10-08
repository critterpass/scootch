import type { ClockTime, DayHeardTime, DayMoment, IsoDate, StartCue } from '../contracts';

import { MINUTE_MS, addDays, clockMinutes, instantOfLocal, localDateTime } from './local-time';
import type { Instant } from './local-time';
import { DAY_ROLLOVER_HOUR } from './scootch-day';

/** No session is shorter than this, so a gap under it holds no length at all. */
export const SHORTEST_LENGTH_MINUTES = 5;

/** What a wall clock in one time zone shows at an instant, as `HH:mm`. */
export function clockAt(instant: Instant, timeZone: string): ClockTime {
  const local = localDateTime(instant, timeZone);
  return `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
}

/**
 * The instant a clock time falls at on a Scootch day. The small hours before the rollover belong
 * to the day before, so on that day they are on the next calendar date.
 */
export function instantOnScootchDay(
  day: IsoDate,
  clock: ClockTime,
  timeZone: string,
  rolloverHour: number = DAY_ROLLOVER_HOUR,
): Instant {
  const late = clockMinutes(clock) < rolloverHour * 60;
  return instantOfLocal(late ? addDays(day, 1) : day, clock, timeZone);
}

/** A moment on the user's wall clock: the instant, and what the clock shows then. */
export interface ClockMoment {
  readonly at: Instant;
  readonly clock: ClockTime;
}

/** When a length started now is over: "Ends at 3:42". */
export function endTime(now: Instant, minutes: number, timeZone: string): ClockMoment {
  const at = now + Math.max(0, minutes) * MINUTE_MS;
  return { at, clock: clockAt(at, timeZone) };
}

/** The clock time a cue stands for: its own, or the one the settings hold for its day moment. */
export function cueClock(
  cue: StartCue,
  moments: Readonly<Record<DayMoment, ClockTime>>,
): ClockTime {
  return cue.kind === 'time' ? cue.at : moments[cue.moment];
}

export interface BackAroundInput {
  readonly cue: StartCue;
  /** The clock time of each day moment, from the settings. */
  readonly moments: Readonly<Record<DayMoment, ClockTime>>;
  /** The Scootch day the thing is set on. */
  readonly localDate: IsoDate;
  readonly timeZone: string;
  readonly now: Instant;
}

export interface BackAround extends ClockMoment {
  /** False once that time has gone by on this Scootch day: there is nothing left to wait for. */
  readonly ahead: boolean;
}

/** When a thing with a cue is brought back on its day: "Back after lunch, around 1:10". */
export function backAround(input: BackAroundInput): BackAround {
  const clock = cueClock(input.cue, input.moments);
  const at = instantOnScootchDay(input.localDate, clock, input.timeZone);
  return { at, clock, ahead: at > input.now };
}

export interface GetReadyInput {
  readonly heardTime: Pick<DayHeardTime, 'at' | 'watched'>;
  /** Minutes before the heard time at which getting ready starts, from the settings. */
  readonly leadMinutes: number;
  /** The Scootch day the time was heard for. */
  readonly localDate: IsoDate;
  readonly timeZone: string;
  readonly now: Instant;
}

/**
 * When getting ready starts for a heard time, or `null` when there is nothing to plan around: the
 * user said "Don't watch it", or the heard time has already gone by.
 */
export function getReadyTime(input: GetReadyInput): ClockMoment | null {
  if (!input.heardTime.watched) return null;
  const heardAt = instantOnScootchDay(input.localDate, input.heardTime.at, input.timeZone);
  if (heardAt <= input.now) return null;
  const at = heardAt - Math.max(0, input.leadMinutes) * MINUTE_MS;
  return { at, clock: clockAt(at, input.timeZone) };
}

/**
 * The longest of the offered lengths that is over within `gapMinutes`, or `null` when none is.
 * Nothing under `SHORTEST_LENGTH_MINUTES` is ever offered into a gap.
 */
export function longestLengthWithin(lengths: readonly number[], gapMinutes: number): number | null {
  const fitting = lengths.filter(
    (length) => length >= SHORTEST_LENGTH_MINUTES && length <= gapMinutes,
  );
  return fitting.length > 0 ? Math.max(...fitting) : null;
}

export interface HeardGap {
  /** When getting ready starts. */
  readonly getReady: ClockMoment;
  /** Whole minutes from now until then; 0 once it has come. */
  readonly gapMinutes: number;
  /** The longest offered length that ends by the get-ready time; `null` when none does. */
  readonly longestMinutes: number | null;
  /** Whether anything fits before getting ready. False offers no length at all. */
  readonly fits: boolean;
}

/**
 * The time left before a heard time, as the wheel needs it. `lengths` are the lengths on offer.
 * `null` when the heard time is not watched or has gone by: the day is then as any other, and the
 * user may still turn the wheel wherever they like.
 */
export function heardGap(
  input: GetReadyInput & { readonly lengths: readonly number[] },
): HeardGap | null {
  const getReady = getReadyTime(input);
  if (getReady === null) return null;
  const gapMinutes = Math.max(0, Math.floor((getReady.at - input.now) / MINUTE_MS));
  const longestMinutes = longestLengthWithin(input.lengths, gapMinutes);
  return { getReady, gapMinutes, longestMinutes, fits: longestMinutes !== null };
}
