import { deleteAccountOfDevice } from '../accounts/delete-account';
import type { RouteDefinition } from '../route';

/**
 * "Delete table account": removes the account the calling device is signed in to, and nothing
 * else. Its seats, friendships, friend links, mutes, blocks and haunts go, on every device linked
 * to it, and so does the link to Apple. The device stays registered: what it has that needs no
 * account (its tasks, its backup, what it shared) is untouched. Asking with no account is fine.
 */
export const accountsDeleteRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/accounts/delete',
  access: 'device',
  handle: async (c) => {
    await deleteAccountOfDevice(c.env, c.var.device.hash);
    return c.json({ deleted: true });
  },
};
