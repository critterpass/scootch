import { z } from 'zod';

import { accountById, accountView, requireAccount, whoCanSit } from '../accounts/accounts';
import { refusal } from '../accounts/ids';
import { normaliseDisplayName, screenDisplayName } from '../accounts/display-name';
import { readBody, type RouteDefinition } from '../route';

const updateAccountRequestSchema = z.strictObject({
  /** The name shown on the person's seat: 2 to 20 characters, screened before it is kept. */
  displayName: z.string().max(80).optional(),
  canBeHaunted: z.boolean().optional(),
  /** Who may sit down beside the person with no link. */
  whoCanSit: z.enum(whoCanSit).optional(),
});

/**
 * Changes the caller's display name, their "can be haunted" switch, or who may sit with them. A name is kept only once
 * the care screen and the `table.name` question have both accepted it.
 */
export const accountsMeUpdateRoute: RouteDefinition = {
  method: 'PUT',
  path: '/v1/accounts/me',
  access: 'device',
  handle: async (c) => {
    const body = await readBody(c, updateAccountRequestSchema);
    const { displayName, canBeHaunted } = body;
    const account = await requireAccount(c);
    if (displayName !== undefined) {
      const name = normaliseDisplayName(displayName);
      if (name === undefined) throw refusal('name_not_acceptable', 'A name is 2 to 20 characters');
      await screenDisplayName({ env: c.env, deviceHash: c.var.device.hash }, name);
      await c.env.DB.prepare('UPDATE accounts SET display_name = ? WHERE id = ?')
        .bind(name, account.id)
        .run();
    }
    if (canBeHaunted !== undefined) {
      await c.env.DB.prepare('UPDATE accounts SET can_be_haunted = ? WHERE id = ?')
        .bind(canBeHaunted ? 1 : 0, account.id)
        .run();
    }
    if (body.whoCanSit !== undefined) {
      await c.env.DB.prepare('UPDATE accounts SET sit_with = ? WHERE id = ?')
        .bind(body.whoCanSit, account.id)
        .run();
    }
    return c.json(accountView((await accountById(c.env.DB, account.id)) ?? account));
  },
};
