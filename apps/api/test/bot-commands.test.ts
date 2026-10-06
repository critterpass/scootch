import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';

import { hashDeviceToken } from '../src/device-auth';

import { addDevice, addUsage, ask } from './bot-support';

// 10:00 on 7 October in Asia/Ho_Chi_Minh. That day began at 17:00 UTC on the 6th, and the month
// at 17:00 UTC on 30 September.
const now = new Date('2026-10-07T03:00:00.000Z');

const today = 'a1'.repeat(32);
const thisWeek = 'b2'.repeat(32);
const lastMonth = 'c3'.repeat(32);
const lastMonthTwin = 'c3c3c3c3' + 'd4'.repeat(28);
const supportToken = 'support-case-token-0123456789abcdefgh';

beforeAll(async () => {
  await addDevice(today, 'en', '2026-10-06T18:00:00.000Z', '2026-10-07T02:00:00.000Z');
  await addDevice(thisWeek, 'vi', '2026-10-03T05:00:00.000Z');
  await addDevice(lastMonth, 'vi', '2026-09-01T00:00:00.000Z');
  await addDevice(lastMonthTwin, 'en', '2026-09-02T00:00:00.000Z');
  await addDevice(await hashDeviceToken(supportToken), 'vi', '2026-09-03T00:00:00.000Z');

  const million = 1_000_000;
  await addUsage({
    route: 'screen.input',
    model: 'jev-1.13.0',
    input: million,
    output: 0,
    at: '2026-10-06T19:00:00.000Z',
    device: today,
  });
  await addUsage({
    route: 'task.create',
    model: 'deepseek-flash',
    input: million,
    output: million,
    at: '2026-10-06T20:00:00.000Z',
    device: today,
  });
  await addUsage({
    route: 'task.create',
    model: 'deepseek-v4-pro',
    input: million,
    output: million,
    at: '2026-10-02T00:00:00.000Z',
    device: thisWeek,
  });
  // Yesterday evening in Ho Chi Minh City, by a model the price table does not know.
  await addUsage({
    route: 'screen.input',
    model: 'mystery-model',
    input: 500,
    output: 500,
    at: '2026-10-06T10:00:00.000Z',
  });
  await addUsage({
    route: 'task.create',
    model: 'deepseek-flash',
    input: million,
    output: million,
    at: '2026-09-15T00:00:00.000Z',
  });
});

describe('/costs', () => {
  it('adds up today and this month by route and by model, on the founder’s clock', async () => {
    expect(await ask('/costs', { now })).toBe(
      [
        '[dev] Model spend (placeholder prices, to be confirmed)',
        'Today: $0.7000 (2 calls)',
        ' By route',
        '  task.create: $0.5000 (1)',
        '  screen.input: $0.2000 (1)',
        ' By model',
        '  deepseek-flash: $0.5000 (1)',
        '  jev-1.13.0: $0.2000 (1)',
        'This month: $3.7000 (4 calls)',
        ' By route',
        '  task.create: $3.5000 (2)',
        '  screen.input: $0.2000 (2)',
        ' By model',
        '  deepseek-v4-pro: $3.0000 (1)',
        '  deepseek-flash: $0.5000 (1)',
        '  jev-1.13.0: $0.2000 (1)',
        '  mystery-model: $0.0000 (1)',
        'No price for: mystery-model (counted as $0)',
      ].join('\n'),
    );
  });
});

describe('/funnel', () => {
  it('counts devices by language and says which later steps have no data', async () => {
    expect(await ask('/funnel', { now })).toBe(
      [
        '[dev] Devices registered',
        'Today: 1 (en 1)',
        'Last 7 days: 2 (en 1, vi 1)',
        'Total: 5 (en 2, vi 3)',
        'No data yet for the later steps: first catch, day seven, trial, paid. Nothing records them.',
      ].join('\n'),
    );
  });
});

describe('/user', () => {
  it('finds a device by the start of its hash', async () => {
    expect(await ask('/user a1a1a1a1', { now })).toBe(
      [
        '[dev] Device: a1a1a1a1a1a1',
        'Created: 2026-10-06T18:00:00.000Z',
        'Last seen: 2026-10-07T02:00:00.000Z',
        'Language: en',
        'Model calls: 2',
      ].join('\n'),
    );
  });

  it('finds a device by its whole token, which is hashed and never stored', async () => {
    const reply = await ask(`/user ${supportToken}`, { now });

    expect(reply).toContain('Created: 2026-09-03T00:00:00.000Z');
    expect(reply).toContain('Language: vi');
    expect(reply).not.toContain(supportToken);
  });

  it('shows only the device’s dates, language and call count: no field that could hold user text', async () => {
    const reply = await ask('/user b2b2b2b2', { now });

    const labels = reply.split('\n').map((line) => line.replace(/^\[dev\] /, '').split(': ')[0]);
    expect(labels).toEqual(['Device', 'Created', 'Last seen', 'Language', 'Model calls']);
    expect(reply).not.toMatch(/task\.create|deepseek/);
  });

  it('asks for more characters when several devices match, and says so when none does', async () => {
    expect(await ask('/user c3c3c3c3', { now })).toBe(
      '[dev] More than one device matches. Send more characters.',
    );
    expect(await ask('/user 0000000000', { now })).toBe('[dev] No device matches.');
    expect(await ask('/user', { now })).toContain('Usage: /user');
    expect(await ask('/user %', { now })).toContain('Usage: /user');
  });
});

describe('/flag', () => {
  it('flips a flag through the flags table and lists it', async () => {
    expect(await ask('/flag@ScootchOpsBot tables.open on')).toBe(
      '[dev] Flag tables.open is now on. No code reads a flag with this name yet.',
    );
    expect(await ask('/flag')).toBe('[dev] Flags:\ntables.open: on (set)');

    await ask('/flag tables.open off');

    const row = await env.DB.prepare('SELECT "on" FROM flags WHERE name = ?')
      .bind('tables.open')
      .first<{ on: number }>();
    expect(row?.on).toBe(0);
    expect(await ask('/flag')).toBe('[dev] Flags:\ntables.open: off (set)');
  });

  it('refuses anything but on or off, and writes nothing', async () => {
    expect(await ask('/flag tables.shut maybe')).toContain('Usage: /flag <name> on|off');
    expect(await ask('/flag Not_A_Name! on')).toContain('Usage: /flag <name> on|off');

    const rows = await env.DB.prepare('SELECT name FROM flags').all<{ name: string }>();
    expect(rows.results.map((row) => row.name)).not.toContain('tables.shut');
  });
});
