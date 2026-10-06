import { requireAccount } from '../accounts/accounts';
import { removeFriend } from '../accounts/friends';
import { accountIdPattern } from '../accounts/ids';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';

/** Ends a friendship. Either of the two can; the other is not told. */
export const friendsRemoveRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/v1/friends/:accountId',
  access: 'device',
  handle: async (c) => {
    const friendId = c.req.param('accountId') ?? '';
    if (!accountIdPattern.test(friendId)) throw new ApiError('not_found', 'No such friend');
    const account = await requireAccount(c);
    await removeFriend(c.env.DB, account.id, friendId);
    return c.json({ removed: true });
  },
};
