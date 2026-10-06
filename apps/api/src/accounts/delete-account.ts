import type { Bindings } from '../env';
import { tablesOf } from '../tables/table-rows';
import { tableStub } from '../tables/tables';

import { accountOfDevice } from './accounts';

/**
 * Removes the account a device is signed in to, as part of "delete everything". Seats are given
 * up first, at the tables themselves. Deleting the account row then takes with it, by the
 * schema's cascades, its device links, friend links and friendships, mutes and blocks in both
 * directions, table invites, seats and haunts sent or received. Reports it made about other
 * people stay, with the link to the reporter cleared; reports about it go.
 */
export async function deleteAccountOfDevice(env: Bindings, deviceHash: string): Promise<void> {
  const account = await accountOfDevice(env.DB, deviceHash);
  if (account === null) return;
  for (const tableId of await tablesOf(env.DB, account.id)) {
    await tableStub(env, tableId).remove(account.id);
  }
  await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(account.id).run();
}
