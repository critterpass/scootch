import { z } from 'zod';

import { requireTableAccount } from '../accounts/accounts';
import { readBody, type RouteDefinition } from '../route';
import { openTable, purchaseClaimSchema } from '../tables/tables';

const openTableRequestSchema = z.strictObject({ purchase: purchaseClaimSchema });

/**
 * Opens a table with the caller seated as host. Anyone with an account can: the purchase state
 * the phone reports decides only how many the table seats (two without Plus, four with it).
 */
export const tablesOpenRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tables',
  access: 'device',
  handle: async (c) => {
    const { purchase } = await readBody(c, openTableRequestSchema);
    const account = await requireTableAccount(c);
    return c.json(await openTable(c.env, account, purchase, new Date()));
  },
};
