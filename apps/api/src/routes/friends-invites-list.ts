import { requireAccount } from '../accounts/accounts';
import { pendingFriendInvites } from '../accounts/friends';
import type { RouteDefinition } from '../route';

/** The caller's friend links that nobody has opened yet, with when each runs out. */
export const friendsInvitesListRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/friends/invites',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json({ invites: await pendingFriendInvites(c.env.DB, account.id, new Date()) });
  },
};
