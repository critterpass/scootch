import { screenVerdictSchema } from '../../../../packages/domain/src/contracts/common';
import { hauntSeedSchema } from '../../../../packages/domain/src/contracts/haunt';
import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { hauntDares, sendHaunt } from '../accounts/haunts';
import { accountIdPattern, refusal } from '../accounts/ids';
import { readBody, type RouteDefinition } from '../route';
import { monsterBodyTypeSchema } from '../tables/table-contract';

/**
 * A monster's body type and seed, a dare from the preset list, and the care verdict the phone
 * stored for the task. Never the task: a strict body with no field that could hold it.
 */
const sendHauntRequestSchema = z.strictObject({
  to: z.string().regex(accountIdPattern),
  bodyType: monsterBodyTypeSchema,
  seed: hauntSeedSchema,
  dare: z.enum(hauntDares),
  anonymous: z.boolean().default(false),
  screen: screenVerdictSchema,
});

/** Sends a friend a monster with a dare. A task that is not a plain `pass` haunts nobody. */
export const hauntsSendRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/haunts',
  access: 'device',
  handle: async (c) => {
    const { screen, ...haunt } = await readBody(c, sendHauntRequestSchema);
    const account = await requireAccount(c);
    if (screen !== 'pass') throw refusal('not_for_this_task', 'This one stays with you');
    await sendHaunt(c.env.DB, account, haunt, new Date());
    return c.json({ sent: true });
  },
};
