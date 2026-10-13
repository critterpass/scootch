import type { PlusCustomerResponse } from '../contracts';
import { plusCustomerId } from '../plus/records';
import type { RouteDefinition } from '../route';

/**
 * The calling device's id at RevenueCat. The phone logs in to RevenueCat with it before buying or
 * restoring, so the store's events about its purchases name an id the server can tie back to the
 * device. The same device always gets the same id.
 */
export const plusCustomerRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/plus/customer',
  access: 'device',
  handle: async (c) =>
    c.json({ appUserId: await plusCustomerId(c.var.device.hash) } satisfies PlusCustomerResponse),
};
