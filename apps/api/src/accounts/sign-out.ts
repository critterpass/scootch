import type { Bindings } from '../env';
import { tablesOf } from '../tables/table-rows';
import { tableStub } from '../tables/tables';

import { accountOfDevice } from './accounts';

/**
 * Signs a device out of its account. Seats are given up first, at the tables themselves, as a
 * seat belongs to the person and they are leaving. Then the device's link to the account goes:
 * the account, its friends and its other devices are untouched, and the device keeps its own
 * token, which from now on belongs to nobody.
 */
export async function signOutDevice(env: Bindings, deviceHash: string): Promise<void> {
  const account = await accountOfDevice(env.DB, deviceHash);
  if (account === null) return;
  for (const tableId of await tablesOf(env.DB, account.id)) {
    await tableStub(env, tableId).remove(account.id);
  }
  await env.DB.prepare('DELETE FROM account_devices WHERE device_hash = ?').bind(deviceHash).run();
}
