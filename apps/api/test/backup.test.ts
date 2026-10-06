import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { BACKUP_MAX_BYTES } from '../src/backup-token';
import { hashDeviceToken, newDeviceToken } from '../src/device-auth';
import * as routes from '../src/routes/index.generated';

import { freshIp, registerDevice, wireErrorOf } from './support';

type BackupCall = {
  method: 'GET' | 'PUT' | 'DELETE';
  deviceToken?: string;
  backupToken?: string;
  body?: unknown;
};

/** One request to `/v1/backup` through the shipped routes, with the backup token in its header. */
async function backup({ method, deviceToken, backupToken, body }: BackupCall): Promise<Response> {
  const headers = new Headers({ 'CF-Connecting-IP': freshIp() });
  if (deviceToken !== undefined) headers.set('Authorization', `Bearer ${deviceToken}`);
  if (backupToken !== undefined) headers.set('X-Backup-Token', backupToken);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/backup', {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
    }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

const snapshot = {
  tasks: [{ id: 'a1', title: 'Water the plants', done: false }],
  settings: { language: 'vi', sound: true },
};

describe('a backup with no account', () => {
  it('stores only the hash of the backup token', async () => {
    const deviceToken = await registerDevice();
    const backupToken = newDeviceToken();

    const put = await backup({ method: 'PUT', deviceToken, backupToken, body: { snapshot } });

    expect(put.status).toBe(200);
    expect(Date.parse((await put.json<{ updatedAt: string }>()).updatedAt)).not.toBeNaN();
    const rows = (await env.DB.prepare('SELECT * FROM backup_snapshots').all()).results;
    expect(rows.map((row) => row['token_hash'])).toContain(await hashDeviceToken(backupToken));
    expect(JSON.stringify(rows)).not.toContain(backupToken);
    expect(JSON.stringify(rows)).not.toContain(deviceToken);
  });

  it('gives back what was stored, and a newer snapshot replaces the older one', async () => {
    const deviceToken = await registerDevice();
    const backupToken = newDeviceToken();

    await backup({ method: 'PUT', deviceToken, backupToken, body: { snapshot } });
    const first = await backup({ method: 'GET', deviceToken, backupToken });
    expect(first.status).toBe(200);
    const stored = await first.json<{ snapshot: unknown; updatedAt: string }>();
    expect(stored.snapshot).toEqual(snapshot);

    const newer = { tasks: [], settings: { language: 'en', sound: false } };
    const replaced = await backup({
      method: 'PUT',
      deviceToken,
      backupToken,
      body: { snapshot: newer },
    });
    const { updatedAt } = await replaced.json<{ updatedAt: string }>();

    const second = await backup({ method: 'GET', deviceToken, backupToken });
    expect(await second.json()).toEqual({ snapshot: newer, updatedAt });
    const hash = await hashDeviceToken(backupToken);
    const kept = await env.DB.prepare('SELECT 1 FROM backup_snapshots WHERE token_hash = ?')
      .bind(hash)
      .all();
    expect(kept.results).toHaveLength(1);
  });

  it('is found from another device that holds the same backup token', async () => {
    const backupToken = newDeviceToken();
    await backup({
      method: 'PUT',
      deviceToken: await registerDevice(),
      backupToken,
      body: { snapshot },
    });

    const restored = await backup({
      method: 'GET',
      deviceToken: await registerDevice(),
      backupToken,
    });

    expect((await restored.json<{ snapshot: unknown }>()).snapshot).toEqual(snapshot);
  });

  it('is not found under a different backup token', async () => {
    const deviceToken = await registerDevice();
    await backup({
      method: 'PUT',
      deviceToken,
      backupToken: newDeviceToken(),
      body: { snapshot },
    });

    const response = await backup({ method: 'GET', deviceToken, backupToken: newDeviceToken() });

    expect(response.status).toBe(404);
    expect(await wireErrorOf(response)).toMatchObject({ code: 'not_found', retryable: false });
  });

  it('refuses a snapshot over the size cap and keeps the earlier one', async () => {
    const deviceToken = await registerDevice();
    const backupToken = newDeviceToken();
    await backup({ method: 'PUT', deviceToken, backupToken, body: { snapshot } });

    // `{"notes":"…"}` is 12 bytes around the text, so this is the largest snapshot that fits.
    const largest = { notes: 'x'.repeat(BACKUP_MAX_BYTES - 12) };
    const tooLarge = { notes: `${largest.notes}x` };
    const refused = await backup({
      method: 'PUT',
      deviceToken,
      backupToken,
      body: { snapshot: tooLarge },
    });

    expect(refused.status).toBe(400);
    expect(await wireErrorOf(refused)).toMatchObject({
      code: 'bad_request',
      retryable: false,
      detail: { reason: 'snapshot_too_large', maxBytes: BACKUP_MAX_BYTES },
    });
    const kept = await backup({ method: 'GET', deviceToken, backupToken });
    expect((await kept.json<{ snapshot: unknown }>()).snapshot).toEqual(snapshot);

    const fits = await backup({
      method: 'PUT',
      deviceToken,
      backupToken,
      body: { snapshot: largest },
    });
    expect(fits.status).toBe(200);
  });

  it('refuses a snapshot that is not a JSON object', async () => {
    const deviceToken = await registerDevice();

    const response = await backup({
      method: 'PUT',
      deviceToken,
      backupToken: newDeviceToken(),
      body: { snapshot: ['a', 'list'] },
    });

    expect(response.status).toBe(400);
    expect((await wireErrorOf(response)).code).toBe('bad_request');
  });

  it('is gone after it is deleted, and deleting again answers the same', async () => {
    const deviceToken = await registerDevice();
    const backupToken = newDeviceToken();
    await backup({ method: 'PUT', deviceToken, backupToken, body: { snapshot } });

    const deleted = await backup({ method: 'DELETE', deviceToken, backupToken });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: true });

    const after = await backup({ method: 'GET', deviceToken, backupToken });
    expect(after.status).toBe(404);
    expect((await wireErrorOf(after)).code).toBe('not_found');
    const again = await backup({ method: 'DELETE', deviceToken, backupToken });
    expect(await again.json()).toEqual({ deleted: true });
  });

  it.for(['GET', 'PUT', 'DELETE'] as const)(
    '%s needs a well-formed backup token',
    async (method) => {
      const deviceToken = await registerDevice();
      const body = method === 'PUT' ? { snapshot } : undefined;

      const missing = await backup({ method, deviceToken, body });
      const malformed = await backup({ method, deviceToken, backupToken: 'short', body });

      expect(missing.status).toBe(400);
      expect((await wireErrorOf(missing)).code).toBe('bad_request');
      expect(malformed.status).toBe(400);
      expect((await wireErrorOf(malformed)).code).toBe('bad_request');
    },
  );

  it.for(['GET', 'PUT', 'DELETE'] as const)('%s needs a registered device', async (method) => {
    const response = await backup({
      method,
      backupToken: newDeviceToken(),
      body: method === 'PUT' ? { snapshot } : undefined,
    });

    expect(response.status).toBe(401);
    expect(await wireErrorOf(response)).toMatchObject({ code: 'unauthorized', retryable: false });
  });
});
