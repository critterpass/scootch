import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { hashDeviceToken, newDeviceToken } from '../src/device-auth';
import { recordAiUsage } from '../src/ledger';

import { call, registerDevice, wireErrorOf } from './support';

const deleteEverything = (token: string | undefined, body: unknown = {}) =>
  call('/v1/data-delete', { method: 'POST', body, ...(token === undefined ? {} : { token }) });

/** Puts a snapshot straight into the database under a new backup token, and returns the token. */
async function storedBackup(): Promise<string> {
  const backupToken = newDeviceToken();
  await env.DB.prepare(
    'INSERT INTO backup_snapshots (token_hash, snapshot, updated_at) VALUES (?, ?, ?)',
  )
    .bind(await hashDeviceToken(backupToken), '{"tasks":[]}', new Date().toISOString())
    .run();
  return backupToken;
}

async function count(table: string, column: string, hash: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`)
    .bind(hash)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe('POST /v1/data-delete', () => {
  it('removes the device and its backup, and the device token stops working', async () => {
    const token = await registerDevice();
    const deviceHash = await hashDeviceToken(token);
    const backupToken = await storedBackup();

    const response = await deleteEverything(token, { backupToken });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(await count('devices', 'token_hash', deviceHash)).toBe(0);
    expect(await count('backup_snapshots', 'token_hash', await hashDeviceToken(backupToken))).toBe(
      0,
    );

    const after = await deleteEverything(token);
    expect(after.status).toBe(401);
    expect(await wireErrorOf(after)).toMatchObject({ code: 'unauthorized', retryable: false });
  });

  it('keeps the spend in the cost ledger but cuts it loose from the device', async () => {
    const token = await registerDevice();
    const deviceHash = await hashDeviceToken(token);
    const route = `data-delete-test-${deviceHash.slice(0, 8)}`;
    await recordAiUsage(env.DB, {
      route,
      model: 'test-model',
      inputTokens: 12,
      outputTokens: 3,
      deviceHash,
    });

    await deleteEverything(token);

    expect(await count('ai_usage', 'device_hash', deviceHash)).toBe(0);
    const spend = await env.DB.prepare('SELECT device_hash FROM ai_usage WHERE route = ?')
      .bind(route)
      .all();
    expect(spend.results).toEqual([{ device_hash: null }]);
  });

  it('leaves other devices and other backups alone', async () => {
    const token = await registerDevice();
    const other = await registerDevice();
    const otherBackup = await storedBackup();

    await deleteEverything(token, { backupToken: await storedBackup() });

    expect(await count('devices', 'token_hash', await hashDeviceToken(other))).toBe(1);
    expect(await count('backup_snapshots', 'token_hash', await hashDeviceToken(otherBackup))).toBe(
      1,
    );
  });

  it('deletes nothing when the backup token is malformed', async () => {
    const token = await registerDevice();

    const response = await deleteEverything(token, { backupToken: 'short' });

    expect(response.status).toBe(400);
    expect((await wireErrorOf(response)).code).toBe('bad_request');
    expect(await count('devices', 'token_hash', await hashDeviceToken(token))).toBe(1);
  });

  it('needs a registered device', async () => {
    const response = await deleteEverything(undefined);

    expect(response.status).toBe(401);
    expect(await wireErrorOf(response)).toMatchObject({ code: 'unauthorized', retryable: false });
  });
});
