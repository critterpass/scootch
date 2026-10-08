import { huntingCount } from '../hunting/hunting';
import type { RouteDefinition } from '../route';

/**
 * How many are in a session right now. A number only; rounding it is the phone's job. Reading it
 * also forgets every beat older than the longest session.
 */
export const huntingCountRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/hunting/count',
  access: 'device',
  handle: async (c) => c.json({ count: await huntingCount(c.env.DB) }),
};
