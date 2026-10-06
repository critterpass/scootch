import { requireTableAccount } from '../accounts/accounts';
import { tableIdPattern } from '../accounts/ids';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';
import { accountHeader, languageHeader } from '../tables/table-contract';
import { tableStub } from '../tables/tables';

/**
 * The table's WebSocket. The device's bearer token says who is connecting; the account id the
 * table sees is set here from that, and whatever a phone put in the same header is overwritten.
 * The query may carry `mode` (a work mode id) and `hidden=1`, and nothing else.
 */
export const tablesSocketRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/tables/:id/ws',
  access: 'device',
  handle: async (c) => {
    const tableId = c.req.param('id') ?? '';
    if (!tableIdPattern.test(tableId)) throw new ApiError('not_found', 'No such table');
    if (c.req.header('Upgrade') !== 'websocket') {
      throw new ApiError('bad_request', 'This address is a WebSocket');
    }
    const account = await requireTableAccount(c);
    const open = await c.env.DB.prepare('SELECT 1 FROM tables WHERE id = ? AND closed_at IS NULL')
      .bind(tableId)
      .first();
    if (open === null) throw new ApiError('not_found', 'No such table');

    const headers = new Headers({ Upgrade: 'websocket' });
    headers.set(accountHeader, account.id);
    headers.set(languageHeader, c.var.device.language);
    return tableStub(c.env, tableId).fetch(new Request(c.req.url, { headers }));
  },
};
