import { requireAccount } from '../accounts/accounts';
import { resolveHaunt } from '../accounts/haunts';
import { tableIdPattern } from '../accounts/ids';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';

/** Shoos a waiting haunt away. Silent: the sender can never learn of it. */
export const hauntsShooRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/haunts/:id/shoo',
  access: 'device',
  handle: async (c) => {
    const hauntId = c.req.param('id') ?? '';
    // A haunt's id has the same shape as a table's.
    if (!tableIdPattern.test(hauntId)) throw new ApiError('not_found', 'No such haunt is waiting');
    const account = await requireAccount(c);
    return c.json({
      haunt: await resolveHaunt(c.env.DB, account.id, hauntId, 'shooed', new Date()),
    });
  },
};
