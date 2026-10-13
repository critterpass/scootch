import { z } from 'zod';

import { requireTableAccount } from '../accounts/accounts';
import { pastedInviteCodeSchema } from '../accounts/codes';
import { isPlusNow } from '../plus/plus-now';
import { readBody, type RouteDefinition } from '../route';
import { joinTable, purchaseClaimSchema } from '../tables/tables';

/**
 * A strict body: a code, and a purchase state that is accepted and ignored. A label, or any other
 * words, is a refusal.
 */
const joinTableRequestSchema = z.strictObject({
  code: pastedInviteCodeSchema,
  purchase: purchaseClaimSchema,
});

/** Takes a seat at the table an invite link points to. The seat is then held for the socket. */
export const tablesJoinRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tables/join',
  access: 'device',
  handle: async (c) => {
    const { code } = await readBody(c, joinTableRequestSchema);
    const account = await requireTableAccount(c);
    const hasPlus = await isPlusNow(c.env, c.var.device.hash);
    return c.json(await joinTable(c.env, account, code, hasPlus, new Date()));
  },
};
