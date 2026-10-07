import { z } from 'zod';

import { registerPushTokenRequestSchema } from '../contracts';
import { ApiError } from '../errors';
import { forgetPushToken, registerPushToken } from '../push/push';
import { readBody, type RouteDefinition } from '../route';

/**
 * Keeps a token Apple gave this phone: its own token for alerts, or a Live Activity's. It is
 * tied to the device that sends it, so it needs no account: pushes that are about an account go
 * to the devices signed in to it. Sending the same token again changes nothing but its time.
 */
export const pushTokensRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/push/tokens',
  access: 'device',
  handle: async (c) => {
    const request = await readBody(c, registerPushTokenRequestSchema);
    // A sandbox token is a development build's: the App Store's app never has one.
    if (c.env.ENVIRONMENT === 'prd' && request.bundleId !== 'app.scootch') {
      throw new ApiError('bad_request', 'This token belongs to another app');
    }
    await registerPushToken(c.env.DB, c.var.device.hash, request, new Date());
    return c.json({ registered: true });
  },
};

const tokenShape = z.string().regex(/^[0-9a-f]{64,200}$/);

/** Forgets a token of this device's: an activity that ended, or notifications switched off. */
export const pushTokensForgetRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/v1/push/tokens/:token',
  access: 'device',
  handle: async (c) => {
    const token = tokenShape.safeParse(c.req.param('token'));
    if (!token.success) throw new ApiError('not_found', 'No such token');
    await forgetPushToken(c.env.DB, c.var.device.hash, token.data);
    return c.json({ forgotten: true });
  },
};
