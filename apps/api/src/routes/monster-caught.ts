import { z } from 'zod';

import { refusal } from '../accounts/ids';
import { hashDeviceToken } from '../device-auth';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';
import { readSharedMonster, unshareTokenHeader } from '../sharing/shared-monsters';

const monsterCaughtRequestSchema = z.strictObject({
  /** Minutes of sessions the catch took, as the caught page says them. */
  catchMinutes: z.number().int().min(1).max(100_000),
});

/**
 * Marks a shared monster caught, so its page and its link preview read CAUGHT. Only whoever
 * shared it can: the request carries the token the share answered with. The first catch stands;
 * telling again changes nothing and answers the same.
 */
export const monsterCaughtRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/monster-page/:id/caught',
  access: 'device',
  handle: async (c) => {
    const id = c.req.param('id') ?? '';
    const { catchMinutes } = await readBody(c, monsterCaughtRequestSchema);
    const token = c.req.header(unshareTokenHeader);
    const row = await c.env.DB.prepare(
      'SELECT unshare_token_hash FROM shared_monsters WHERE id = ?',
    )
      .bind(id)
      .first<{ unshare_token_hash: string }>();
    if (!row) throw new ApiError('not_found', 'No such shared monster');
    if (token === undefined || (await hashDeviceToken(token)) !== row.unshare_token_hash) {
      throw refusal('not_yours', 'This monster was shared by someone else');
    }
    await c.env.DB.prepare(
      'UPDATE shared_monsters SET caught_at = ?, catch_minutes = ? WHERE id = ? AND caught_at IS NULL',
    )
      .bind(new Date().toISOString(), catchMinutes, id)
      .run();
    return c.json(await readSharedMonster(c.env.DB, id));
  },
};
