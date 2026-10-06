import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { hashDeviceToken } from '../src/device-auth';
import type { RouteDefinition } from '../src/route';

import { call, freshIp, registerDevice, wireErrorOf } from './support';

const whoAmIRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/who-am-i',
  access: 'device',
  handle: (c) => c.json(c.var.device),
};

async function deviceRows(): Promise<Record<string, unknown>[]> {
  return (await env.DB.prepare('SELECT * FROM devices').all()).results;
}

describe('device registration', () => {
  it('gives a new phone a token and stores only its hash', async () => {
    const token = await registerDevice();

    const hash = await hashDeviceToken(token);
    const rows = await deviceRows();
    expect(rows.filter((row) => row['token_hash'] === hash)).toEqual([
      expect.objectContaining({ language: 'en' }),
    ]);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it('is idempotent: the same token registers one device and keeps its first day', async () => {
    const token = 'restored-from-the-keychain-0123456789abcdef';
    const hash = await hashDeviceToken(token);
    const rowsFor = async () => (await deviceRows()).filter((row) => row['token_hash'] === hash);

    expect(await registerDevice(token)).toBe(token);
    const [first] = await rowsFor();
    expect(await registerDevice(token)).toBe(token);

    const again = await rowsFor();
    expect(again).toHaveLength(1);
    expect(again[0]?.['created_at']).toBe(first?.['created_at']);
  });

  it('refuses a token too short to be safe', async () => {
    const response = await call('/v1/devices', {
      method: 'POST',
      body: { language: 'vi', token: 'short' },
    });

    expect(response.status).toBe(400);
    expect((await wireErrorOf(response)).code).toBe('bad_request');
  });
});

describe('a route for registered devices', () => {
  it('lets a registered device in and tells the route who it is', async () => {
    const token = await registerDevice();

    const response = await call('/v1/who-am-i', { token }, [whoAmIRoute]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hash: await hashDeviceToken(token), language: 'en' });
  });

  it('rejects a request with no token', async () => {
    const response = await call('/v1/who-am-i', {}, [whoAmIRoute]);

    expect(response.status).toBe(401);
    expect(await wireErrorOf(response)).toMatchObject({ code: 'unauthorized', retryable: false });
  });

  it('rejects a token that was never registered', async () => {
    const response = await call(
      '/v1/who-am-i',
      { token: 'never-registered-0123456789abcdefghijkl' },
      [whoAmIRoute],
    );

    expect(response.status).toBe(401);
    expect((await wireErrorOf(response)).code).toBe('unauthorized');
  });
});

/** Calls until one is refused, and returns that answer. Fails if none is within `most` calls. */
async function callUntilRefused(most: number, send: () => Promise<Response>): Promise<Response> {
  for (let sent = 0; sent < most; sent += 1) {
    const response = await send();
    if (response.status !== 200) return response;
  }
  throw new Error(`no call was refused in ${most}`);
}

describe('rate limits', () => {
  it('trips per address and says the call can be retried', async () => {
    const ip = freshIp();

    const refused = await callUntilRefused(200, () => call('/v1/health', { ip }));

    expect(refused.status).toBe(429);
    expect(await wireErrorOf(refused)).toMatchObject({ code: 'rate_limited', retryable: true });
    expect(refused.headers.get('Retry-After')).toBe('60');
    // Another address is not affected.
    expect((await call('/v1/health')).status).toBe(200);
  });

  it('trips per device even when every call comes from a new address', async () => {
    const token = await registerDevice();

    const refused = await callUntilRefused(200, () =>
      call('/v1/who-am-i', { token }, [whoAmIRoute]),
    );

    expect(refused.status).toBe(429);
    expect(await wireErrorOf(refused)).toMatchObject({ code: 'rate_limited', retryable: true });
    // Another device is not affected.
    const other = await registerDevice();
    expect((await call('/v1/who-am-i', { token: other }, [whoAmIRoute])).status).toBe(200);
  });
});
