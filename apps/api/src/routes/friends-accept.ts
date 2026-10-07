import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { acceptFriendInvite } from '../accounts/friends';
import { pastedInviteCodeSchema } from '../accounts/codes';
import { readBody, type RouteDefinition } from '../route';

const acceptRequestSchema = z.strictObject({ code: pastedInviteCodeSchema });

/**
 * Accepts a friend link, given as the bare code (typed or pasted) or as the link itself. Beside
 * sitting down through a table link, this is the only way two accounts become friends.
 */
export const friendsAcceptRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/friends/accept',
  access: 'device',
  handle: async (c) => {
    const { code } = await readBody(c, acceptRequestSchema);
    const account = await requireAccount(c);
    return c.json(await acceptFriendInvite(c.env.DB, account.id, code, new Date()));
  },
};
