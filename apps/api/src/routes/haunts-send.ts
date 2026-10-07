import { screenVerdictSchema } from '../../../../packages/domain/src/contracts/common';
import { monsterSpecSchema } from '../../../../packages/domain/src/contracts/art';
import { hauntSeedSchema } from '../../../../packages/domain/src/contracts/haunt';
import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { hauntDares, sendHaunt } from '../accounts/haunts';
import { accountIdPattern, refusal } from '../accounts/ids';
import { hauntMonsterWordsSchema } from '../contracts';
import { readBody, type RouteDefinition } from '../route';
import { monsterBodyTypeSchema } from '../tables/table-contract';

/**
 * A monster's body type and seed, a dare from the preset list, the care verdict the phone
 * stored for the task, and the monster's words as the server wrote and signed them. Never the
 * task: a strict body, and words are taken only with the server's own signature.
 */
const sendHauntRequestSchema = z.strictObject({
  to: z.string().regex(accountIdPattern),
  bodyType: monsterBodyTypeSchema,
  seed: hauntSeedSchema,
  dare: z.enum(hauntDares),
  anonymous: z.boolean().default(false),
  screen: screenVerdictSchema,
  /** The words the task call wrote for this monster, with the server's signature over them. */
  words: hauntMonsterWordsSchema.optional(),
  /** The monster's drawing as the phone has it, so a catch keeps the same monster. */
  spec: monsterSpecSchema.optional(),
});

/**
 * Sends a friend a monster with a dare, and answers with the id of its page on the website. A
 * task that is not a plain `pass` haunts nobody, and the phone's word is not taken alone: the
 * monster's words must carry the server's signature, which it gives only to a task that passed.
 */
export const hauntsSendRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/haunts',
  access: 'device',
  handle: async (c) => {
    const { screen, ...haunt } = await readBody(c, sendHauntRequestSchema);
    const account = await requireAccount(c);
    if (screen !== 'pass') throw refusal('not_for_this_task', 'This one stays with you');
    return c.json(await sendHaunt(c.env, account, haunt, new Date()));
  },
};
