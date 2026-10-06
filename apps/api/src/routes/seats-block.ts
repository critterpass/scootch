import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { accountIdPattern } from '../accounts/ids';
import { readBody, type RouteDefinition } from '../route';
import { setBlocked } from '../tables/seat-controls';

const blockRequestSchema = z.strictObject({
  accountId: z.string().regex(accountIdPattern),
  blocked: z.boolean(),
});

/** Blocks or unblocks a person: blocked, the two can no longer share a table. */
export const seatsBlockRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/seats/block',
  access: 'device',
  handle: async (c) => {
    const { accountId, blocked } = await readBody(c, blockRequestSchema);
    await setBlocked(c.env, await requireAccount(c), accountId, blocked);
    return c.json({ blocked });
  },
};
