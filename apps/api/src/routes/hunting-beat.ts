import { z } from 'zod';

import { recordBeat } from '../hunting/hunting';
import { readBody, type RouteDefinition } from '../route';

const huntingBeatRequestSchema = z.strictObject({
  hunting: z.boolean(),
});

/**
 * The phone says a session began (`hunting: true`) or ended (`false`). The beat says nothing
 * else: no task, no label, no session id. Which device it is comes from the bearer token.
 */
export const huntingBeatRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/hunting/beat',
  access: 'device',
  handle: async (c) => {
    const { hunting } = await readBody(c, huntingBeatRequestSchema);
    await recordBeat(c.env.DB, c.var.device.hash, hunting);
    return c.json({ hunting });
  },
};
