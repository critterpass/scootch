import type { Language } from '../contracts';

import { seatShown } from './labels';
import { TABLE_MAX_NUDGES, type TableServerMessage } from './table-contract';
import {
  capacityOf,
  nudgesLeftFor,
  recentlyLeft,
  seatStatus,
  type StoredTable,
} from './table-state';

type State = Extract<TableServerMessage, { type: 'state' }>;

/**
 * The full snapshot as one person is sent it: labels in their language, and on each seat the
 * nudges they themselves may still send that person.
 */
export function snapshotFor(
  table: StoredTable,
  viewerId: string,
  language: Language,
  isOnline: (accountId: string) => boolean,
  now: number,
): State {
  const viewer = table.seats.find((seat) => seat.accountId === viewerId);
  const others = table.seats.filter((seat) => seat.accountId !== viewerId);
  const left = (to: string) => (viewer ? nudgesLeftFor(viewer, to) : 0);
  return {
    type: 'state',
    tableId: table.id,
    you: viewerId,
    hostId: table.hostId,
    capacity: capacityOf(table),
    seats: table.seats.map((seat) => {
      const online = isOnline(seat.accountId);
      return {
        userId: seat.accountId,
        ...seatShown(seat, language),
        name: seat.name,
        online,
        status: seatStatus(table, seat, online, now),
        done: seat.done === true,
        ...(seat.seatedAt === undefined ? {} : { seatedAt: seat.seatedAt }),
        nudgesLeft:
          seat.accountId === viewerId
            ? Math.max(
                TABLE_MAX_NUDGES * Number(others.length === 0),
                ...others.map((o) => left(o.accountId)),
              )
            : left(seat.accountId),
      };
    }),
    endsAt: table.endsAt,
    minutes: table.minutes,
    serverNow: now,
    left: recentlyLeft(table, now),
  };
}
