import { ApiError } from '../errors';
import { deliverySchema, takeInEvent } from '../plus/webhook-events';
import type { RouteDefinition } from '../route';
import { sameSecret } from '../same-secret';

/**
 * Where RevenueCat delivers the store's events: purchases, renewals, cancellations, expiries,
 * billing trouble and transfers. It has no device behind it, so it is public, and it acts only on
 * a delivery whose Authorization header is the one RevenueCat is set to send. Each event is taken
 * in once, however often it is delivered; this is the server's only source for who holds Plus,
 * besides one question to RevenueCat's API for a device it has heard nothing about.
 *
 * Any answer but a 200 makes RevenueCat deliver the event again later.
 */
export const revenueCatWebhookRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/revenuecat/webhook',
  access: 'public',
  handle: async (c) => {
    const expected = c.env.REVENUECAT_WEBHOOK_AUTH;
    const given = c.req.header('Authorization');
    if (!expected || given === undefined || !(await sameSecret(given, expected))) {
      throw new ApiError('unauthorized', 'Not a RevenueCat delivery');
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = deliverySchema.safeParse(body);
    if (!parsed.success) throw new ApiError('bad_request', 'Not a RevenueCat event');
    const outcome = await takeInEvent(c.env.DB, parsed.data.event, new Date());
    return c.json({ outcome });
  },
};
