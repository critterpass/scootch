import { requireAccount } from '../accounts/accounts';
import { countWaitingHaunts, waitingHaunts } from '../accounts/haunt-reads';
import { hauntsWaitingResponseSchema } from '../contracts';
import type { RouteDefinition } from '../route';

/** The haunts waiting for the caller. The phone asks when it opens. */
export const hauntsListRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/haunts',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    return c.json({ haunts: await waitingHaunts(c.env.DB, account.id, new Date()) });
  },
};

/**
 * Whether anything is waiting: a count and nothing else, for a phone coming to the front. A
 * device with no account is told zero, not refused.
 */
export const hauntsWaitingRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/haunts/waiting',
  access: 'device',
  handle: async (c) =>
    c.json(
      hauntsWaitingResponseSchema.parse({
        waiting: await countWaitingHaunts(c.env.DB, c.var.device.hash, new Date()),
      }),
    ),
};
