import { z } from 'zod';

import { requireTableAccount } from '../accounts/accounts';
import { isPlusNow } from '../plus/plus-now';
import { readBody, type RouteDefinition } from '../route';
import { openTable, purchaseClaimSchema } from '../tables/tables';

const openTableRequestSchema = z.strictObject({ purchase: purchaseClaimSchema });

/**
 * Opens a table with the caller seated as host. Anyone with an account can: whether the device
 * holds Plus, by the server's own record, decides only how many the table seats (two without
 * Plus, four with it). A purchase state in the body is accepted and ignored.
 */
export const tablesOpenRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tables',
  access: 'device',
  handle: async (c) => {
    await readBody(c, openTableRequestSchema);
    const account = await requireTableAccount(c);
    const hasPlus = await isPlusNow(c.env, c.var.device.hash);
    return c.json(await openTable(c.env, account, hasPlus, new Date()));
  },
};
