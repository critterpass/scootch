import { languageSchema } from '../contracts';
import { z } from 'zod';

import { deviceTokenPattern, hashDeviceToken, newDeviceToken } from '../device-auth';
import { readBody, type RouteDefinition } from '../route';

/**
 * A phone that already holds a token (restored from its keychain or iCloud) sends it; a phone
 * without one leaves it out and keeps the token it is given.
 */
const registerDeviceRequestSchema = z.object({
  token: z.string().regex(deviceTokenPattern).optional(),
  language: languageSchema,
});

/**
 * Registers an anonymous device. Sending the same token again changes nothing but its language
 * and last-seen time, so the phone can call this on every launch.
 */
export const devicesRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/devices',
  access: 'public',
  handle: async (c) => {
    const { token = newDeviceToken(), language } = await readBody(c, registerDeviceRequestSchema);
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO devices (token_hash, language, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?3)
       ON CONFLICT (token_hash) DO UPDATE
         SET language = excluded.language, last_seen_at = excluded.last_seen_at`,
    )
      .bind(await hashDeviceToken(token), language, now)
      .run();
    return c.json({ token });
  },
};
