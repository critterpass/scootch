import { MINUTE_MS, type SessionMinutes } from '@scootch/domain';

import type { TableState } from './table-store';

/** The trip a start takes to reach the table, and the least the end is ever moved by. */
export const CLOCK_SLACK_MS = 5_000;
const WORTH_MOVING_MS = 1_000;

type TableClock = Pick<TableState, 'status' | 'endsAt' | 'minutes' | 'clockAhead'>;

/**
 * When the table's session ends, read on this phone's clock; `null` with none running. It is the
 * last end the table sent, so it stays true while the line is down.
 */
export function tableEndsAt(table: Omit<TableClock, 'status'>, now: number): number | null {
  if (table.endsAt === null) return null;
  const at = Math.round(table.endsAt - table.clockAhead);
  return at > now ? at : null;
}

/** Whole minutes left of the table's session, rounded up; `null` with none running. */
export function tableMinutesLeft(table: Omit<TableClock, 'status'>, now: number): number | null {
  const at = tableEndsAt(table, now);
  return at === null ? null : Math.ceil((at - now) / MINUTE_MS);
}

/**
 * Where the person's own running session should end so that it shows the table's clock, or
 * `null` to leave it as it is.
 *
 * The table's clock is taken only while the line is up: with it down the session runs on its own
 * end, which is the last one the table gave. It is taken only for the table session this one
 * belongs to (begun with it or during it, not one the table started while the person was already
 * working alone). And the countdown never gains time: a later end is taken only within the few
 * seconds a start needs to reach the table, so coming back after a drop cannot wind it back.
 */
export function sharedEnd(
  table: TableClock,
  own: { readonly startedAt: number | null; readonly endsAt: number | null },
  now: number,
): number | null {
  if (table.status !== 'online' || own.startedAt === null || own.endsAt === null) return null;
  const end = tableEndsAt(table, now);
  const minutes: SessionMinutes | null = table.minutes;
  if (end === null || minutes === null) return null;
  if (own.startedAt < end - minutes * MINUTE_MS - CLOCK_SLACK_MS) return null;
  if (end > own.endsAt + CLOCK_SLACK_MS) return null;
  return Math.abs(end - own.endsAt) < WORTH_MOVING_MS ? null : end;
}
