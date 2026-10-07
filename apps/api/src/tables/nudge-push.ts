import type { Bindings } from '../env';
import { nudgePush } from '../push/push-lines';
import { pushToAccount } from '../push/push';

import { nudgesLeftFor, type StoredTable } from './table-state';

/** How a nudge reaches its person: muted by them, over their open connection, by push, or not. */
export type NudgeReach = 'muted' | 'online' | 'pushed' | 'none';

/**
 * Sends a nudge as a push to someone seated whose phone has no connection to the table. Nothing
 * is sent for a nudge the table would refuse anyway: a stranger to the table, or the limit.
 */
export async function pushNudge(
  env: Bindings,
  table: StoredTable | null,
  from: string,
  to: string,
): Promise<'pushed' | 'none'> {
  const sender = table?.seats.find((seat) => seat.accountId === from);
  if (!table || !sender || !table.seats.some((seat) => seat.accountId === to)) return 'none';
  if (nudgesLeftFor(sender, to) === 0) return 'none';
  const pushed = await pushToAccount(env, to, nudgePush(sender.name, table.id), new Date());
  return pushed ? 'pushed' : 'none';
}
