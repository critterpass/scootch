import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { memberNumberResponseSchema } from '../src/contracts';
import { hashDeviceToken } from '../src/device-auth';

import { call, registerDevice, wireErrorOf } from './support';

async function numberFor(token: string): Promise<number> {
  const response = await call('/v1/members/number', { method: 'POST', token });
  expect(response.status).toBe(200);
  return memberNumberResponseSchema.parse(await response.json()).number;
}

describe('the member number', () => {
  it('gives a device a number once, and the same number every time it asks again', async () => {
    const token = await registerDevice();
    const first = await numberFor(token);
    expect(await numberFor(token)).toBe(first);
    expect(await numberFor(token)).toBe(first);
    const rows = await env.DB.prepare('SELECT device_hash FROM member_numbers WHERE number = ?')
      .bind(first)
      .all();
    expect(rows.results).toEqual([{ device_hash: await hashDeviceToken(token) }]);
  });

  it('never gives two devices the same number, and hands them out in the order they asked', async () => {
    const tokens = await Promise.all([registerDevice(), registerDevice(), registerDevice()]);
    const numbers: number[] = [];
    for (const token of tokens) numbers.push(await numberFor(token));
    expect(new Set(numbers).size).toBe(3);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    // Asked at the same moment, two phones still get two numbers.
    const [a, b] = await Promise.all([registerDevice(), registerDevice()]);
    const together = await Promise.all([numberFor(a), numberFor(b)]);
    expect(new Set([...numbers, ...together]).size).toBe(5);
  });

  it('does not hand a number out again after the device that held it deletes everything', async () => {
    const token = await registerDevice();
    const gone = await numberFor(token);
    const deleted = await call('/v1/data-delete', { method: 'POST', token, body: {} });
    expect(deleted.status).toBe(200);
    const kept = await env.DB.prepare('SELECT COUNT(*) AS n FROM member_numbers WHERE number = ?')
      .bind(gone)
      .first<{ n: number }>();
    expect(kept?.n).toBe(0);
    expect(await numberFor(await registerDevice())).toBeGreaterThan(gone);
  });

  it('gives nothing to a phone that is not registered', async () => {
    const response = await call('/v1/members/number', { method: 'POST' });
    expect(response.status).toBe(401);
    expect((await wireErrorOf(response)).code).toBe('unauthorized');
  });
});
