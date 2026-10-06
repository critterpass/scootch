import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { acceptFriendInvite } from '../accounts/friends';
import { inviteCodePattern } from '../accounts/ids';
import { readBody, type RouteDefinition } from '../route';

const acceptRequestSchema = z.strictObject({ code: z.string().regex(inviteCodePattern) });

/** Accepts a friend link. This is the only way two accounts become friends. */
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
