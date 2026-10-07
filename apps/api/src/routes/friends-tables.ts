import { requireAccount } from '../accounts/accounts';
import { friendsTablesResponseSchema } from '../contracts';
import type { RouteDefinition } from '../route';
import { friendsTables } from '../tables/friends-tables';

/** The open tables a friend is seated at and the caller may join ("Kofi is here"). */
export const friendsTablesRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/friends/tables',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json(friendsTablesResponseSchema.parse(await friendsTables(c.env.DB, account.id)));
  },
};
