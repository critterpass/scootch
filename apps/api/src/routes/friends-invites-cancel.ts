import { requireAccount } from '../accounts/accounts';
import { cancelFriendInvite } from '../accounts/friends';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';

const inviteIdPattern = /^[0-9a-f]{64}$/;

/** Cancels one of the caller's own unused friend links. Cancelling twice is fine. */
export const friendsInvitesCancelRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/v1/friends/invites/:id',
  access: 'device',
  handle: async (c) => {
    const id = c.req.param('id') ?? '';
    if (!inviteIdPattern.test(id)) throw new ApiError('not_found', 'No such link');
    const account = await requireAccount(c);
    await cancelFriendInvite(c.env.DB, account.id, id);
    return c.json({ cancelled: true });
  },
};
