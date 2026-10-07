import { requireAccount } from '../accounts/accounts';
import { resolveHaunt } from '../accounts/haunts';
import { tableIdPattern } from '../accounts/ids';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';

/**
 * Catches a waiting haunt. The answer carries the monster that was sent (its drawing, its seed
 * and its signed words), so the phone starts ten minutes with that monster and no other.
 */
export const hauntsCatchRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/haunts/:id/catch',
  access: 'device',
  handle: async (c) => {
    const hauntId = c.req.param('id') ?? '';
    // A haunt's id has the same shape as a table's.
    if (!tableIdPattern.test(hauntId)) throw new ApiError('not_found', 'No such haunt is waiting');
    const account = await requireAccount(c);
    return c.json({
      haunt: await resolveHaunt(c.env.DB, account.id, hauntId, 'caught', new Date()),
    });
  },
};
