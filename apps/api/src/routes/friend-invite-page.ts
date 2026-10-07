import { readFriendInvitePage } from '../accounts/friends';
import { inviteCodePattern } from '../accounts/ids';
import { friendInvitePageSchema } from '../contracts';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';

/**
 * What a friend link's page shows before anyone opens the app. The code is the only key: no
 * device and no account. An unknown code is `not_found`; one that was used or has run out
 * answers `gone` and names nobody. The answer is for its one reader and is never kept.
 */
export const friendInvitePageRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/friend-invite/:code',
  access: 'public',
  handle: async (c) => {
    const code = c.req.param('code') ?? '';
    const invite = inviteCodePattern.test(code)
      ? await readFriendInvitePage(c.env.DB, code, new Date())
      : null;
    if (invite === null) throw new ApiError('not_found', 'No such invite');
    c.header('Cache-Control', 'private, no-store');
    return c.json(friendInvitePageSchema.parse(invite));
  },
};
