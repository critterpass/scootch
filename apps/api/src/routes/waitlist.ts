import { z } from 'zod';

import { languageSchema } from '../contracts';
import { readBody, type RouteDefinition } from '../route';

const waitlistRequestSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
  language: languageSchema,
  /** Which release the person is waiting for. */
  platform: z.enum(['ios', 'android']).default('ios'),
  /** The monster the launch-day email should carry into the app. */
  monsterId: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .nullish(),
});

/**
 * One email on the day the app is out. One row per address: asking again adds the other platform
 * or a newer monster to the same row. No email is sent from here.
 */
export const waitlistRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/waitlist',
  access: 'public',
  handle: async (c) => {
    const request = await readBody(c, waitlistRequestSchema);
    const ios = request.platform === 'ios' ? 1 : 0;
    await c.env.DB.prepare(
      `INSERT INTO waitlist (email, ios, android, monster_id, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET
         ios = MAX(ios, excluded.ios),
         android = MAX(android, excluded.android),
         monster_id = COALESCE(excluded.monster_id, monster_id),
         language = excluded.language`,
    )
      .bind(
        request.email,
        ios,
        1 - ios,
        request.monsterId ?? null,
        request.language,
        new Date().toISOString(),
      )
      .run();
    return c.json({ listed: true });
  },
};
