import { requireTableAccount } from '../accounts/accounts';
import { tableIdPattern } from '../accounts/ids';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';
import { createTableInvite } from '../tables/tables';

/** A link code for a table the caller is seated at. It dies with the table, or in a day. */
export const tablesInvitesRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tables/:id/invites',
  access: 'device',
  handle: async (c) => {
    const tableId = c.req.param('id') ?? '';
    if (!tableIdPattern.test(tableId)) throw new ApiError('not_found', 'No such table');
    const account = await requireTableAccount(c);
    return c.json(await createTableInvite(c.env.DB, account.id, tableId, new Date()));
  },
};
