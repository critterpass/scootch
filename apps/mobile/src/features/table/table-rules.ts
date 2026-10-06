import type { Href } from 'expo-router';

import type { SessionMinutes, TaskRow, WorkMode } from '@scootch/domain';

import { refusalOf } from '../../api/together-api';
import { showsComedy, showsSelling, type SellingDay } from '../../state/shows-comedy';

export const TABLE_LOBBY = '/table' as Href;
export const TABLE_SEAT = '/table/seat' as Href;
export const FRIENDS = '/friends' as Href;
export const ACCOUNT = '/account' as Href;
/** Where an account is asked for, coming back to the path `next` afterwards. */
export const accountThen = (next: string) => `/account?next=${encodeURIComponent(next)}` as Href;
export const FRIENDS_ACCEPTED = '/friends?accepted=1' as Href;

const INVITE_HOST = 'https://scootch.app';
const CODE = /^[a-z2-7]{10}$/;

export const tableInviteLink = (code: string) => `${INVITE_HOST}/t/${code}`;
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
 * its lobby holds a Plus control and nothing is sold near something heavy.
 */
export function showsTableEntry(day: SellingDay): boolean {
  return showsSelling(day) && 'task' in day.today;
}

/**
 * What a tap on "Open a table" does: it opens a table with Plus, and without it is the quiet
 * locked control whose tap opens the sheet. The sheet's route is named only where that tap is.
 */
export function openTableStep(plus: boolean): 'open' | 'locked' {
  return plus ? 'open' : 'locked';
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

/** What the table's timer offers one person. `start` and `join_in` both begin their own session. */
export type TableTimer =
  | { readonly kind: 'start'; readonly minutes: SessionMinutes }
  | { readonly kind: 'join_in'; readonly minutes: SessionMinutes }
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
  mine: { readonly taskSet: boolean; readonly inSession: boolean },
  now: number,
): TableTimer {
  if (mine.inSession) return { kind: 'running' };
  if (!mine.taskSet) return { kind: 'need_task' };
  const going = table.endsAt !== null && table.endsAt - table.clockAhead > now;
  return going ? { kind: 'join_in', minutes: table.minutes ?? 10 } : { kind: 'start', minutes: 10 };
}
