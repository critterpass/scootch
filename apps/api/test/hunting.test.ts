import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  huntingBeatResponseSchema,
  huntingCountResponseSchema,
  type HuntingBeatRequest,
} from '../../../packages/domain/src/contracts/hunting';

import { call, registerDevice, wireErrorOf } from './support';

const minute = 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

function later(ms: number): void {
  vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + ms });
}

async function beat(token: string, body: HuntingBeatRequest): Promise<void> {
  const response = await call('/v1/hunting/beat', { method: 'POST', token, body });
  expect(response.status).toBe(200);
  expect(huntingBeatResponseSchema.parse(await response.json())).toEqual(body);
}

async function countNow(token: string): Promise<number> {
  const response = await call('/v1/hunting/count', { token });
  expect(response.status).toBe(200);
  return huntingCountResponseSchema.parse(await response.json()).count;
}

async function rowsKept(): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM hunting_beats').first<{
    n: number;
  }>();
  return row?.n ?? 0;
}

describe('how many are hunting', () => {
  it('counts a session from its start to its end', async () => {
    const [mai, an] = [await registerDevice(), await registerDevice()];
    const before = await countNow(mai);

    await beat(mai, { hunting: true });
    expect(await countNow(mai)).toBe(before + 1);
    await beat(an, { hunting: true });
    expect(await countNow(an)).toBe(before + 2);

    await beat(mai, { hunting: false });
    expect(await countNow(mai)).toBe(before + 1);
    await beat(an, { hunting: false });
    expect(await countNow(an)).toBe(before);
    // An end with no start changes nothing.
    await beat(an, { hunting: false });
    expect(await countNow(an)).toBe(before);
  });

  it('forgets a start with no end once the longest session has passed', async () => {
    const [mai, an] = [await registerDevice(), await registerDevice()];
    const before = await countNow(mai);
    const rowsBefore = await rowsKept();
    await beat(mai, { hunting: true });

    later(179 * minute);
    expect(await countNow(an)).toBe(before + 1);

    later(minute);
    expect(await countNow(an)).toBe(before);
    // The read that stopped counting it removed the row itself: no beat had to follow.
    expect(await rowsKept()).toBe(rowsBefore);
  });

  it('keeps a row whose time has not run out when the count is read', async () => {
    const [mai, an] = [await registerDevice(), await registerDevice()];
    const rowsBefore = await rowsKept();
    await beat(mai, { hunting: true });

    later(179 * minute);
    await countNow(an);
    expect(await rowsKept()).toBe(rowsBefore + 1);

    await beat(mai, { hunting: false });
    expect(await rowsKept()).toBe(rowsBefore);
  });

  it('counts a device once however many times it starts', async () => {
    const mai = await registerDevice();
    const before = await countNow(mai);

    await beat(mai, { hunting: true });
    await beat(mai, { hunting: true });
    expect(await countNow(mai)).toBe(before + 1);

    // A later start is a new session: its 180 minutes run from then.
    later(100 * minute);
    await beat(mai, { hunting: true });
    later(100 * minute);
    expect(await countNow(mai)).toBe(before + 1);

    await beat(mai, { hunting: false });
    expect(await countNow(mai)).toBe(before);
  });

  it('keeps nothing of a device that deletes everything', async () => {
    const [mai, an] = [await registerDevice(), await registerDevice()];
    const before = await countNow(an);
    await beat(mai, { hunting: true });

    const deleted = await call('/v1/data-delete', { method: 'POST', token: mai, body: {} });
    expect(deleted.status).toBe(200);

    expect(await countNow(an)).toBe(before);
  });

  it('takes a beat that says began or ended and nothing more', async () => {
    const mai = await registerDevice();
    const before = await countNow(mai);

    for (const body of [{}, { hunting: 'yes' }, { hunting: true, task: 'Email the dentist' }]) {
      const refused = await call('/v1/hunting/beat', { method: 'POST', token: mai, body });
      expect(refused.status).toBe(400);
      expect(await wireErrorOf(refused)).toMatchObject({ code: 'bad_request' });
    }
    expect(await countNow(mai)).toBe(before);
  });

  it('refuses a call with no registered device', async () => {
    const unknown = 'u'.repeat(43);
    const before = await rowsKept();

    for (const token of [undefined, unknown]) {
      const beatRefused = await call('/v1/hunting/beat', {
        method: 'POST',
        body: { hunting: true },
        ...(token === undefined ? {} : { token }),
      });
      expect(beatRefused.status).toBe(401);
      expect(await wireErrorOf(beatRefused)).toMatchObject({ code: 'unauthorized' });

      const countRefused = await call('/v1/hunting/count', token === undefined ? {} : { token });
      expect(countRefused.status).toBe(401);
      expect(await wireErrorOf(countRefused)).toMatchObject({ code: 'unauthorized' });
    }
    expect(await rowsKept()).toBe(before);
  });

  it('limits how often one device can beat or read', async () => {
    const mai = await registerDevice();
    const send = [
      () => call('/v1/hunting/beat', { method: 'POST', token: mai, body: { hunting: true } }),
      () => call('/v1/hunting/count', { token: mai }),
    ];

    let refused: Response | undefined;
    for (let sent = 0; sent < 200 && refused === undefined; sent += 1) {
      const response = await send[sent % 2]!();
      if (response.status !== 200) refused = response;
    }

    expect(refused?.status).toBe(429);
    expect(await wireErrorOf(refused!)).toMatchObject({ code: 'rate_limited', retryable: true });
    expect(refused!.headers.get('Retry-After')).toBe('60');
    // Another device is not affected.
    const an = await registerDevice();
    expect((await call('/v1/hunting/count', { token: an })).status).toBe(200);
  });
});
