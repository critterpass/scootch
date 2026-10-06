import { z } from 'zod';

import { accountView, signInWithApple } from '../accounts/accounts';
import { readBody, type RouteDefinition } from '../route';

const signInRequestSchema = z.strictObject({
  /** Apple's identity token, as the phone received it. */
  identityToken: z.string().min(1).max(4096),
  /** The value from `/v1/accounts/apple/nonce` that was handed to Apple's sheet. */
  nonce: z.string().regex(/^[a-z2-7]{32}$/),
});

/**
 * Signs the calling device in with Apple and links it to the account behind Apple's stable
 * subject, creating the account the first time. The answer holds nothing secret: the device
 * keeps using its own token. No email is read or stored.
 */
export const accountsAppleRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/accounts/apple',
  access: 'device',
  handle: async (c) => {
    const body = await readBody(c, signInRequestSchema);
    const { account, created } = await signInWithApple(
      c.env.DB,
      c.var.device.hash,
      body,
      new Date(),
    );
    return c.json({ ...accountView(account), created });
  },
};
