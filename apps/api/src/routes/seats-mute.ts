import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { accountIdPattern } from '../accounts/ids';
import { readBody, type RouteDefinition } from '../route';
import { setMuted } from '../tables/seat-controls';

const muteRequestSchema = z.strictObject({
  accountId: z.string().regex(accountIdPattern),
  muted: z.boolean(),
});

/** Mutes or unmutes nudges from one person, at every table. They are never told. */
export const seatsMuteRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/seats/mute',
  access: 'device',
  handle: async (c) => {
    const { accountId, muted } = await readBody(c, muteRequestSchema);
    await setMuted(c.env.DB, await requireAccount(c), accountId, muted);
    return c.json({ muted });
  },
};
