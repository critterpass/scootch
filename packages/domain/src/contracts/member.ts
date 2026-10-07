import { z } from 'zod';

/**
 * The member card's number, as the server hands it out: the next whole number, once for each
 * installation, in the order people joined. It is never reused and never says who anyone is.
 */
export const memberNumberResponseSchema = z.strictObject({
  number: z.number().int().min(1),
});
export type MemberNumberResponse = z.infer<typeof memberNumberResponseSchema>;
