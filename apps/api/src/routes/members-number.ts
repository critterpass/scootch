import type { MemberNumberResponse } from '../contracts';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';

/**
 * The calling device's member number. The first call takes the next number; every later call
 * gives the same one back, so a phone that lost the answer can simply ask again. The server does
 * not check that the phone holds Plus: the number is a keepsake printed on a card, and unlocks
 * nothing.
 */
export const membersNumberRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/members/number',
  access: 'device',
  handle: async (c) => {
    const db = c.env.DB;
    const deviceHash = c.var.device.hash;
    await db
      .prepare('INSERT OR IGNORE INTO member_numbers (device_hash, issued_at) VALUES (?, ?)')
      .bind(deviceHash, new Date().toISOString())
      .run();
    const row = await db
      .prepare('SELECT number FROM member_numbers WHERE device_hash = ?')
      .bind(deviceHash)
      .first<{ number: number }>();
    if (row === null) throw new ApiError('internal', 'No member number could be kept');
    return c.json({ number: row.number } satisfies MemberNumberResponse);
  },
};
