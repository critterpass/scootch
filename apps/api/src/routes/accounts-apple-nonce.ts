import { issueAppleNonce } from '../accounts/accounts';
import type { RouteDefinition } from '../route';

/**
 * The first step of Sign in with Apple, asked for only at a table: a one-time value the phone
 * hands to Apple's sheet. Apple signs it into the identity token, so a token works once.
 */
export const accountsAppleNonceRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/accounts/apple/nonce',
  access: 'device',
  handle: async (c) =>
    c.json({ nonce: await issueAppleNonce(c.env.DB, c.var.device.hash, new Date()) }),
};
