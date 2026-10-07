import { z } from 'zod';

import { requireTableAccount } from '../accounts/accounts';
import { tableIdPattern } from '../accounts/ids';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';
import { joinFriendsTable, purchaseClaimSchema } from '../tables/tables';

const joinFriendRequestSchema = z.strictObject({ purchase: purchaseClaimSchema });

/** Takes a seat at a table a friend is seated at, in one tap and with no link. */
export const tablesJoinFriendRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tables/:id/join',
  access: 'device',
  handle: async (c) => {
    const tableId = c.req.param('id') ?? '';
    if (!tableIdPattern.test(tableId)) throw new ApiError('not_found', 'No such table');
    const { purchase } = await readBody(c, joinFriendRequestSchema);
    const account = await requireTableAccount(c);
    return c.json(await joinFriendsTable(c.env, account, tableId, purchase));
  },
};
