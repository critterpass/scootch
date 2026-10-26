import type { TuitionCustomerResponse } from '../contracts';
import type { RouteDefinition } from '../route';
import { tuitionCustomerId } from '../tuition/records';

/**
 * The calling device's id at RevenueCat. The phone logs in to RevenueCat with it before buying or
 * restoring, so the store's events about its purchases name an id the server can tie back to the
 * device. The same device always gets the same id.
 */
export const tuitionCustomerRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/tuition/customer',
  access: 'device',
  handle: async (c) =>
    c.json({
      appUserId: await tuitionCustomerId(c.var.device.hash),
    } satisfies TuitionCustomerResponse),
};
