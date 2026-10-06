import { z } from 'zod';

import { requireTableAccount } from '../accounts/accounts';
import { inviteCodePattern } from '../accounts/ids';
import { readBody, type RouteDefinition } from '../route';
import { joinTable, purchaseClaimSchema } from '../tables/tables';

/** A strict body: a code and a purchase state. A label, or any other words, is a refusal. */
const joinTableRequestSchema = z.strictObject({
  code: z.string().regex(inviteCodePattern),
  purchase: purchaseClaimSchema,
});

/** Takes a seat at the table an invite link points to. The seat is then held for the socket. */
export const tablesJoinRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tables/join',
  access: 'device',
  handle: async (c) => {
    const { code, purchase } = await readBody(c, joinTableRequestSchema);
    const account = await requireTableAccount(c);
    return c.json(await joinTable(c.env, account, code, purchase, new Date()));
  },
};
