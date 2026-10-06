import { accountView, requireAccount } from '../accounts/accounts';
import type { RouteDefinition } from '../route';

/** The caller's own account: its id, name and settings. */
export const accountsMeRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/accounts/me',
  access: 'device',
  handle: async (c) => c.json(accountView(await requireAccount(c))),
};
