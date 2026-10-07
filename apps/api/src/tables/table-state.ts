import { FRIEND_PASS_SEATS } from '@scootch/domain';

import {
  TABLE_MAX_NUDGES,
  TABLE_MAX_SEATS,
  type SessionMinutes,
  type WorkMode,
} from './table-contract';

/**
 * A seat whose person has been offline this long is freed. Someone who was in the table's
 * session keeps theirs until this long after the session ends, however long they were offline:
 * a locked phone drops its connection, and that is what working looks like.
 */
export const offlineSeatMs = 10 * 60 * 1000;
/** A table with nobody seated closes after this long. */
export const emptyTableMs = 10 * 60 * 1000;
/** How long the table remembers someone who left, so it can say they finished and went. */
export const leftRememberedMs = 5 * 60 * 1000;

/**
 * A seat as the table stores it. It belongs to an account, not a connection. Nothing in it is
 * free text but the display name, which the screen accepted before the account could sit down.
 */
export type StoredSeat = {
  accountId: string;
  name: string;
  workMode: WorkMode | null;
  hidden: boolean;
  /** Nudges sent to anyone since the last session started. */
  nudgesSent: number;
  /** The same nudges by receiver, as account id to count: the limit is three per person. */
  nudges?: Record<string, number>;
  /** Seated without Plus, on the opener's friend pass. */
  onPass: boolean;
  /** Epoch ms when the last connection went away; null while one is open. */
  offlineSince: number | null;
  /** Epoch ms when they sat down. */
  seatedAt?: number;
  /** Connected at some point in the running session, so the seat is kept to its end. */
  inSession?: boolean;
  /** Said they have finished, since the last session started. */
  done?: boolean;
};

export type LeftSeat = { userId: string; name: string; done: boolean; at: number };

/** Everything a table knows, under one storage key so it survives hibernation whole. */
export type StoredTable = {
  id: string;
  /** Whose friend pass covers the free guests, even after they leave. */
  openerId: string;
  hostId: string | null;
  seats: StoredSeat[];
  /** How many it seats, fixed when it opened. Absent on a table opened before seats were capped. */
  capacity?: number;
  endsAt: number | null;
  minutes: SessionMinutes | null;
  /** Epoch ms since when nobody has been seated; null while someone is. */
  emptySince: number | null;
  /** Who left lately, oldest first. */
  left?: LeftSeat[];
};

export const capacityOf = (table: StoredTable): number => table.capacity ?? TABLE_MAX_SEATS;

export type Guest = {
  readonly accountId: string;
  readonly name: string;
  /** The joiner's own purchase state holds Plus, so they need no place on the pass. */
  readonly hasPlus: boolean;
  /** Accounts on either side of a block with the joiner. */
  readonly blockedWith: readonly string[];
};

export type AdmitResult =
  'seated' | 'already_seated' | 'table_full' | 'pass_full' | 'closed' | 'blocked';

export function newTable(
  id: string,
  opener: { accountId: string; name: string },
  capacity: number,
  now: number,
): StoredTable {
  return {
    id,
    capacity,
    openerId: opener.accountId,
    hostId: opener.accountId,
    seats: [newSeat(opener.accountId, opener.name, false, now)],
    endsAt: null,
    minutes: null,
    emptySince: null,
  };
}

function newSeat(accountId: string, name: string, onPass: boolean, now: number): StoredSeat {
  // Offline until the first connection: someone admitted who never connects loses the seat.
  return {
    accountId,
    name,
    workMode: null,
    hidden: false,
    nudgesSent: 0,
    nudges: {},
    onPass,
    offlineSince: now,
    seatedAt: now,
    inSession: false,
    done: false,
  };
}

/**
 * Seats a guest, or says why not. At most the table's capacity; the opener's pass covers at most
 * three guests without Plus; nobody is seated with someone they have blocked or who has blocked
 * them.
 */
export function admit(table: StoredTable, guest: Guest, now: number): AdmitResult {
  if (table.seats.some((seat) => seat.accountId === guest.accountId)) return 'already_seated';
  if (table.seats.some((seat) => guest.blockedWith.includes(seat.accountId))) return 'blocked';
  if (table.seats.length >= capacityOf(table)) return 'table_full';
  const onPass = !guest.hasPlus && guest.accountId !== table.openerId;
  if (onPass && table.seats.filter((seat) => seat.onPass).length >= FRIEND_PASS_SEATS) {
    return 'pass_full';
  }
  table.seats.push(newSeat(guest.accountId, guest.name, onPass, now));
  table.hostId ??= guest.accountId;
  table.emptySince = null;
  return 'seated';
}

/**
 * Frees a seat. The next person becomes host; the session, if one is running, goes on. With
 * `remember`, the table keeps for a few minutes that they left and whether they had finished.
 */
export function freeSeat(
  table: StoredTable,
  accountId: string,
  now: number,
  remember = false,
): boolean {
  const seat = table.seats.find((candidate) => candidate.accountId === accountId);
  if (!seat) return false;
  table.seats = table.seats.filter((candidate) => candidate !== seat);
  if (table.hostId === accountId) table.hostId = table.seats[0]?.accountId ?? null;
  if (table.seats.length === 0) table.emptySince = now;
  if (remember) {
    const left = { userId: accountId, name: seat.name, done: seat.done === true, at: now };
    table.left = [...recentlyLeft(table, now), left].slice(-TABLE_MAX_SEATS);
  }
  return true;
}

/** Who left recently enough to still be said. */
export function recentlyLeft(table: StoredTable, now: number): LeftSeat[] {
  return (table.left ?? []).filter((left) => left.at + leftRememberedMs > now);
}

const sessionRuns = (table: StoredTable, now: number): boolean =>
  table.endsAt !== null && table.endsAt > now;

/** Starts the table's session: nudges and "done" count afresh, and whoever is here is in it. */
export function startSession(
  table: StoredTable,
  minutes: SessionMinutes,
  now: number,
  isOnline: (accountId: string) => boolean,
): void {
  table.endsAt = now + minutes * 60_000;
  table.minutes = minutes;
  for (const seat of table.seats) {
    seat.nudgesSent = 0;
    seat.nudges = {};
    seat.done = false;
    seat.inSession = isOnline(seat.accountId);
  }
}

/** A connection opened for this seat. Mid-session, that puts its person in the session. */
export function connected(table: StoredTable, seat: StoredSeat, now: number): void {
  seat.offlineSince = null;
  if (sessionRuns(table, now)) seat.inSession = true;
}

/** What others are shown of a seat's presence. */
export function seatStatus(
  table: StoredTable,
  seat: StoredSeat,
  online: boolean,
  now: number,
): 'here' | 'working' | 'away' {
  if (online) return 'here';
  return seat.inSession === true && sessionRuns(table, now) ? 'working' : 'away';
}

/** The nudges `from` may still send `to` since the last session started. */
export function nudgesLeftFor(from: StoredSeat, to: string): number {
  return Math.max(0, TABLE_MAX_NUDGES - (from.nudges?.[to] ?? 0));
}

/** Counts one nudge that reached its person. */
export function countNudge(from: StoredSeat, to: string): void {
  from.nudges = { ...from.nudges, [to]: (from.nudges?.[to] ?? 0) + 1 };
  from.nudgesSent += 1;
}

/** When an offline seat is freed: ten minutes on, or ten minutes after the session they are in. */
function seatFreeAt(table: StoredTable, seat: StoredSeat): number | null {
  if (seat.offlineSince === null) return null;
  const from =
    seat.inSession === true && table.endsAt !== null
      ? Math.max(table.endsAt, seat.offlineSince)
      : seat.offlineSince;
  return from + offlineSeatMs;
}

/** When the table's one alarm must next fire: the session's end, a seat to free, or closing. */
export function nextAlarmAt(table: StoredTable): number | null {
  const due = [
    table.endsAt,
    table.emptySince === null ? null : table.emptySince + emptyTableMs,
    ...table.seats.map((seat) => seatFreeAt(table, seat)),
  ].filter((at): at is number => at !== null);
  return due.length === 0 ? null : Math.min(...due);
}

/**
 * What the alarm finds due at `now`: a session that has run out, seats whose person has been
 * offline long enough (a seat marked offline whose person is in fact connected is put right
 * instead), and whether the table has now been empty long enough to close. When a session ends,
 * the offline people who were in it are given the ten minutes from its end to come back.
 */
export function tick(
  table: StoredTable,
  now: number,
  isOnline: (accountId: string) => boolean,
): { ended: boolean; freed: string[]; close: boolean } {
  const endedAt = table.endsAt !== null && table.endsAt <= now ? table.endsAt : null;
  if (endedAt !== null) {
    for (const seat of table.seats) {
      if (seat.inSession === true && seat.offlineSince !== null) {
        seat.offlineSince = Math.max(seat.offlineSince, endedAt);
      }
      seat.inSession = false;
    }
    table.endsAt = null;
    table.minutes = null;
  }
  const freed: string[] = [];
  for (const seat of [...table.seats]) {
    const freeAt = seatFreeAt(table, seat);
    if (freeAt === null || freeAt > now) continue;
    if (isOnline(seat.accountId)) seat.offlineSince = null;
    else if (freeSeat(table, seat.accountId, now, true)) freed.push(seat.accountId);
  }
  if (table.seats.length === 0 && table.emptySince === null) table.emptySince = now;
  const close = table.emptySince !== null && table.emptySince + emptyTableMs <= now;
  return { ended: endedAt !== null, freed, close };
}
