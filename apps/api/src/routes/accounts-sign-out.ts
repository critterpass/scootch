import { signOutDevice } from '../accounts/sign-out';
import type { RouteDefinition } from '../route';

/**
 * Ends the account session of the calling device. Afterwards its token opens nothing that needs
 * an account (tables, friends, haunts) until the person signs in again. Asking twice is fine.
 */
export const accountsSignOutRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/accounts/sign-out',
  access: 'device',
  handle: async (c) => {
    await signOutDevice(c.env, c.var.device.hash);
    return c.json({ signedOut: true });
  },
};
