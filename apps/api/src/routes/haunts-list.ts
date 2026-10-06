import { requireAccount } from '../accounts/accounts';
import { waitingHaunts } from '../accounts/haunts';
import type { RouteDefinition } from '../route';

/** The haunts waiting for the caller. The phone asks when it opens. */
export const hauntsListRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/haunts',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json({ haunts: await waitingHaunts(c.env.DB, account.id) });
  },
};
