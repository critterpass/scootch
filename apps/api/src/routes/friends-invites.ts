import { requireAccount } from '../accounts/accounts';
import { createFriendInvite } from '../accounts/friends';
import type { RouteDefinition } from '../route';

/** A friend link: a short code that makes its first taker the caller's friend, and expires. */
export const friendsInvitesRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/friends/invites',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json(await createFriendInvite(c.env.DB, account.id, new Date()));
  },
};
