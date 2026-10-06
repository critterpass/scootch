import { requireAccount } from '../accounts/accounts';
import { listFriends } from '../accounts/friends';
import type { RouteDefinition } from '../route';

/** The caller's own friends. There is no search and no directory: this is the only list. */
export const friendsListRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/friends',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json({ friends: await listFriends(c.env.DB, account.id) });
  },
};
