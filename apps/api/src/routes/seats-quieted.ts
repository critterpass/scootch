import { requireAccount } from '../accounts/accounts';
import type { RouteDefinition } from '../route';
import { quietedBy } from '../tables/seat-controls';

/** The people the caller has muted and the people the caller has blocked, to undo either. */
export const seatsQuietedRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/seats/quieted',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json(await quietedBy(c.env.DB, account.id));
  },
};
