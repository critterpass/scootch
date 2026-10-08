import type { TaskRow } from '@scootch/domain';
import type { Href } from 'expo-router';

import type { TogetherRuntime } from '../../state/together-context';

import { TABLE_LOBBY, TABLE_SEAT, accountThen, joinOutcomeOf, labelModeFor } from './table-rules';

export interface Sat {
  /** Where to go next: the seat, the account page first, or the lobby that says what went wrong. */
  readonly to: Href;
  /** True when the seat was taken: the others are worth asking for again. */
  readonly seated: boolean;
}

/**
 * Takes a seat at a friend's open table, with the label today's thing may show. Used by the pill
 * on home and by the widget's open seat: a seat is only ever taken this one way.
 */
export async function sitWithFriend(
  together: Pick<TogetherRuntime, 'api' | 'table' | 'purchaseState'>,
  tableId: string,
  task: TaskRow | null,
): Promise<Sat> {
  try {
    const id = await together.api.joinFriendsTable(tableId, together.purchaseState());
    together.table.sit(id, labelModeFor(task));
    return { to: TABLE_SEAT, seated: true };
  } catch (error) {
    const outcome = joinOutcomeOf(error);
    // The lobby says what went wrong and offers what is left; an account is asked for first.
    const needsAccount = outcome === 'not_signed_in' || outcome === 'name_required';
    return { to: needsAccount ? accountThen('/table') : TABLE_LOBBY, seated: false };
  }
}
