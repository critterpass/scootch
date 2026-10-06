import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { hashDeviceToken } from '../src/device-auth';
import { createFlagReader } from '../src/flags';
import { recordAiUsage } from '../src/ledger';

import { registerDevice } from './support';

async function columnsOf(table: string): Promise<string[]> {
  const { results } = await env.DB.prepare(`SELECT name FROM pragma_table_info('${table}')`).all<{
    name: string;
  }>();
  return results.map((column) => column.name);
}

describe('migrations', () => {
  it('apply to an empty database and are all recorded', async () => {
    const applied = await env.DB.prepare('SELECT name FROM d1_migrations ORDER BY name').all<{
      name: string;
    }>();

    expect(applied.results.map((row) => row.name)).toEqual(
      env.TEST_MIGRATIONS.map((migration) => migration.name).sort(),
    );
    expect(env.TEST_MIGRATIONS.length).toBeGreaterThan(0);
    expect(await columnsOf('devices')).toEqual([
      'token_hash',
      'language',
      'created_at',
      'last_seen_at',
    ]);
    expect(await columnsOf('ai_usage')).toEqual([
      'id',
      'route',
      'model',
      'input_tokens',
      'output_tokens',
      'device_hash',
      'project',
      'created_at',
    ]);
    expect(await columnsOf('flags')).toEqual(['name', 'on']);
  });
});

describe('the cost ledger', () => {
  it('records a model call under the project tag and outlives the device', async () => {
    const deviceHash = await hashDeviceToken(await registerDevice());

    await recordAiUsage(env.DB, {
      route: 'task.create',
      model: 'deepseek-flash',
      inputTokens: 812,
      outputTokens: 240,
      deviceHash,
    });
    await env.DB.prepare('DELETE FROM devices WHERE token_hash = ?').bind(deviceHash).run();

    const row = await env.DB.prepare(
      "SELECT route, model, input_tokens, output_tokens, device_hash, project FROM ai_usage WHERE route = 'task.create'",
    ).first();
    expect(row).toEqual({
      route: 'task.create',
      model: 'deepseek-flash',
      input_tokens: 812,
      output_tokens: 240,
      device_hash: null,
      project: 'scootch',
    });
  });
});

describe('feature flags', () => {
  const flags = createFlagReader({ dark_feature: false, live_feature: true });

  it('uses the default from the code until a row says otherwise', async () => {
    expect(await flags.isOn(env.DB, 'dark_feature')).toBe(false);
    expect(await flags.isOn(env.DB, 'live_feature')).toBe(true);

    await env.DB.prepare(
      `INSERT INTO flags (name, "on") VALUES ('dark_feature', 1), ('live_feature', 0)`,
    ).run();

    expect(await flags.isOn(env.DB, 'dark_feature')).toBe(true);
    expect(await flags.isOn(env.DB, 'live_feature')).toBe(false);
  });
});
