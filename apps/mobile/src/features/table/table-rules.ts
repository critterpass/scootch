import type { Href } from 'expo-router';

import {
  TABLE_FREE_SEATS,
  TABLE_MAX_SEATS,
  type SessionMinutes,
  type TaskRow,
  type WorkMode,
} from '@scootch/domain';

import { refusalOf } from '../../api/together-api';
import { showsComedy, showsSelling, type SellingDay } from '../../state/shows-comedy';

import { tableMinutesLeft } from './table-clock';

export const TABLE_LOBBY = '/table' as Href;
export const TABLE_SEAT = '/table/seat' as Href;
export const FRIENDS = '/friends' as Href;
export const ACCOUNT = '/account' as Href;
/** Where an account is asked for, coming back to the path `next` afterwards. */
export const accountThen = (next: string) => `/account?next=${encodeURIComponent(next)}` as Href;
export const FRIENDS_ACCEPTED = '/friends?accepted=1' as Href;
export const TABLE_SETTINGS = '/table-settings' as Href;
export const TABLE_QUIETED = '/table-quieted' as Href;
/** The name step alone, for someone who already has an account, then back to `next`. */
export const renameThen = (next: string) =>
  `/account?rename=1&next=${encodeURIComponent(next)}` as Href;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Whole days until `expiresAt`, rounded up and never less than one: "Expires in 2 days". */
export function daysUntil(expiresAt: string, now: number): number {
  const left = Date.parse(expiresAt) - now;
  return Number.isFinite(left) ? Math.max(1, Math.ceil(left / DAY_MS)) : 1;
}

/**
 * A length carried in an address ("Start at a table" on the way to a seat): whole minutes a
 * session may run for, or `null` when the address carries none.
 */
export function startMinutesFrom(param: string | undefined): number | null {
  if (param === undefined || !/^\d{1,2}$/.test(param)) return null;
  const minutes = Number(param);
  return minutes >= 1 && minutes <= 60 ? minutes : null;
}

const carrying = (path: string, minutes: number | null) =>
  minutes === null ? path : `${path}?minutes=${minutes}`;
/** The lobby, and the seat, on the way to a start of `minutes`. */
export const lobbyPath = (minutes: number | null) => carrying('/table', minutes);
export const seatPath = (minutes: number | null) => carrying('/table/seat', minutes);

/** The lengths a table's shared timer runs for. */
const TABLE_LENGTHS = [10, 25, 50] as const satisfies readonly SessionMinutes[];

/**
 * The shared timer a start of `minutes` asks the table for: the shortest that covers it, so the
 * person's own session is never cut short by the table's. `null` when none covers it: the session
 * then runs beside a table whose timer was not started.
 */
export function tableLengthFor(minutes: number): SessionMinutes | null {
  return TABLE_LENGTHS.find((length) => length >= minutes) ?? null;
}

const INVITE_HOST = 'https://scootch.app';
const CODE = /^[a-z2-7]{10}$/;

export const friendInviteLink = (code: string) => `${INVITE_HOST}/f/${code}`;

/** The code inside a pasted invite link, or a code typed on its own; `null` when it is neither. */
export function inviteCodeFrom(pasted: string): string | null {
  const last =
    pasted
      .trim()
      .toLowerCase()
      .split(/[/?#\s]/)
      .filter(Boolean)
      .pop() ?? '';
  return CODE.test(last) ? last : null;
}

/**
 * Whether "Sit with someone" is on the screen. It is offered beside an ordinary task and at no
 * other time: never on a crisis day, beside a serious task, or on a day that held one, because
 * its lobby holds a Plus control (four seats) and nothing is sold near something heavy.
 */
export function showsTableEntry(day: SellingDay): boolean {
  return showsSelling(day) && 'task' in day.today;
}

/**
 * How many a table opened from this phone seats: anyone may open one for two, and Plus seats
 * four. The server fixes the number when the table opens; this is only what the lobby says.
 */
export function seatsToOpen(plus: boolean): number {
  return plus ? TABLE_MAX_SEATS : TABLE_FREE_SEATS;
}

/**
 * The work mode a seat tells the table, which the server turns into its one or two words. Only an
 * ordinary, screened task has one: a serious or unscreened task sits with no label at all.
 */
export function labelModeFor(
  task: Pick<TaskRow, 'screen' | 'seriousOverridden' | 'workMode'> | null,
): WorkMode | null {
  return task !== null && showsComedy(task, 'card') ? task.workMode : null;
}

/**
 * How asking for a seat came out. The server gives one answer for a link that expired, a table
 * that closed and a table holding someone on either side of a block, so the phone cannot tell
 * them apart either: all three are `link_ended`.
 */
export type JoinOutcome =
  | 'link_ended'
  | 'full'
  | 'banned'
  | 'name_required'
  | 'not_signed_in'
  | 'plus_required'
  | 'unreachable';

export function joinOutcomeOf(error: unknown): JoinOutcome {
  switch (refusalOf(error)) {
    case 'invite_not_valid':
    case 'not_found':
      return 'link_ended';
    case 'table_full':
    case 'pass_full':
      return 'full';
    case 'not_allowed':
      return 'banned';
    case 'name_required':
      return 'name_required';
    case 'account_required':
      return 'not_signed_in';
    case 'plus_required':
      return 'plus_required';
    default:
      return 'unreachable';
  }
}

/**
 * What the table's timer offers one person. `start` and `join_in` both begin their own session;
 * joining in, it ends with the table's, `left` whole minutes from now.
 */
export type TableTimer =
  | { readonly kind: 'start'; readonly minutes: number }
  | { readonly kind: 'join_in'; readonly minutes: number; readonly left: number }
  | { readonly kind: 'running' }
  | { readonly kind: 'need_task' };

/**
 * The table's timer as this person meets it. Their own session is the normal one: a table can
 * start it or be joined by it, and never ends it.
 */
export function tableTimer(
  table: {
    readonly endsAt: number | null;
    readonly minutes: SessionMinutes | null;
    readonly clockAhead: number;
  },
  mine: {
    readonly taskSet: boolean;
    readonly inSession: boolean;
    /** The length the person chose before sitting down; ten minutes when they chose none. */
    readonly wanted?: number | null;
  },
  now: number,
): TableTimer {
  if (mine.inSession) return { kind: 'running' };
  if (!mine.taskSet) return { kind: 'need_task' };
  // Joining in is for the time the table has left, not for a length of the person's own.
  const left = tableMinutesLeft(table, now);
  return left === null
    ? { kind: 'start', minutes: mine.wanted ?? 10 }
    : { kind: 'join_in', minutes: table.minutes ?? 10, left };
}
