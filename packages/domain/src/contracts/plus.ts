import { z } from 'zod';

/**
 * The id this installation is known by at RevenueCat, as the server hands it out. The phone logs
 * in to RevenueCat with it before any purchase or restore, so the store's events about it reach
 * the server and the server can tell, on its own, whether the phone holds Plus. It is derived
 * from the device and says nothing about who anyone is.
 */
export const plusCustomerResponseSchema = z.strictObject({
  appUserId: z.string().regex(/^[0-9a-f]{64}$/),
});
export type PlusCustomerResponse = z.infer<typeof plusCustomerResponseSchema>;
