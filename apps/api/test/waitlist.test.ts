import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it } from 'vitest';

import { call, wireErrorOf } from './support';

const join = (body: unknown) => call('/v1/waitlist', { method: 'POST', body });

async function rows(): Promise<Record<string, unknown>[]> {
  return (await env.DB.prepare('SELECT * FROM waitlist ORDER BY email').all()).results;
}

afterEach(async () => {
  await env.DB.prepare('DELETE FROM waitlist').run();
});

describe('POST /v1/waitlist', () => {
  it('stores one row per address, with the monster the launch email should carry', async () => {
    const first = await join({
      email: ' Priya@Example.com ',
      language: 'en',
      monsterId: 'molar-7f3k9x',
    });
    expect(first.status).toBe(200);
    // The same person again, for Android this time and with no monster.
    await join({ email: 'priya@example.com', language: 'en', platform: 'android' });

    expect(await rows()).toEqual([
      expect.objectContaining({
        email: 'priya@example.com',
        ios: 1,
        android: 1,
        monster_id: 'molar-7f3k9x',
        language: 'en',
      }),
    ]);
  });

  it.each(['not an email', 'a@b', '', 'two@@example.com words'])(
    'rejects the bad email %j and stores nothing',
    async (email) => {
      const response = await join({ email, language: 'vi' });

      expect(response.status).toBe(400);
      const error = await wireErrorOf(response);
      expect(error.code).toBe('bad_request');
      // The error says where, never what was typed.
      expect(JSON.stringify(error)).not.toContain('words');
      expect(await rows()).toEqual([]);
    },
  );
});
