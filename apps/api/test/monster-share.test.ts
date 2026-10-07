import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { signWords } from '../src/sharing/signed-words';
import * as routes from '../src/routes/index.generated';

import { connectionDrops, providers } from './ai-providers';
import { call, freshIp, shareSecret, wireErrorOf } from './support';
import { jevDecides } from './task-create-support';

const typed = 'email the dentist about the thing nobody should read';
const written = {
  seed: 'dentist',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  language: 'en',
} as const;
/** The maker's words with the signature the maker would have given for them. */
const monster = {
  ...written,
  signature: await signWords(shareSecret, { ...written, title: '' }),
};
const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };

/** Shares one monster with the screen answered at the network boundary. */
async function share(body: unknown, screen: Parameters<typeof jevDecides>[0] = ordinary) {
  const doubles = providers({ jev: jevDecides(screen), deepseek: connectionDrops });
  vi.stubGlobal('fetch', doubles.fetch);
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/monster-share', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': freshIp(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    {
      ...env,
      TYPESAFE_API_KEY: 'jev-test-key',
      DEEPSEEK_API_KEY: 'deepseek-test-key',
      SHARE_SIGNING_SECRET: shareSecret,
    },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  vi.unstubAllGlobals();
  return { doubles, response };
}

async function stored(): Promise<Record<string, unknown>[]> {
  return (await env.DB.prepare('SELECT * FROM shared_monsters').all()).results;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await env.DB.prepare('DELETE FROM shared_monsters').run();
});

describe('POST /v1/monster-share', () => {
  it('stores no typed line when the visitor hid what they typed', async () => {
    const { response } = await share(monster);

    expect(response.status).toBe(200);
    const { id } = await response.json<{ id: string }>();
    expect(id).toMatch(/^molar-[a-z0-9]{6}$/);
    const rows = await stored();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id, typed_line: null, name: monster.name });
    expect(JSON.stringify(rows)).not.toContain('dentist about');
  });

  it('keeps the typed line when the visitor chose to show it, and never the token itself', async () => {
    const { response } = await share({ ...monster, typed });

    const { id, unshareToken } = await response.json<{ id: string; unshareToken: string }>();
    const rows = await stored();
    expect(rows[0]).toMatchObject({ id, typed_line: typed });
    expect(JSON.stringify(rows)).not.toContain(unshareToken);

    const page = await call(`/v1/monster-page/${id}`);
    expect(await page.json()).toMatchObject({ id, typed, status: 'wild', caughtAt: null });
  });

  it.each([
    ['crisis', { pass: 0.05, serious: 0.15, crisis: 0.8 }],
    ['serious', { pass: 0.2, serious: 0.78, crisis: 0.02 }],
  ] as const)('never stores a %s text', async (verdict, screen) => {
    const { response, doubles } = await share({ ...monster, typed }, screen);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verdict });
    expect(await stored()).toEqual([]);
    // What the visitor typed went through the screen; the server's own words did not.
    expect(JSON.stringify(doubles.sent.jev[0])).toContain(typed);
    expect(JSON.stringify(doubles.sent.jev)).not.toContain(monster.name);
  });

  it('stores nothing when no model could screen the text', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { response } = await share({ ...monster, typed }, connectionDrops);

    expect(await response.json()).toEqual({ verdict: 'serious' });
    expect(await stored()).toEqual([]);
  });
});

describe('DELETE /v1/monster-share/:id', () => {
  it('unshares with the token, and the page is then not found', async () => {
    const { response } = await share({ ...monster, typed });
    const { id, unshareToken } = await response.json<{ id: string; unshareToken: string }>();
    expect((await call(`/v1/monster-page/${id}/preview.png`)).status).toBe(200);

    const wrong = await call(`/v1/monster-share/${id}`, {
      method: 'DELETE',
      token: 'x'.repeat(43),
    });
    expect(wrong.status).toBe(401);
    expect(await stored()).toHaveLength(1);

    const unshared = await call(`/v1/monster-share/${id}`, {
      method: 'DELETE',
      token: unshareToken,
    });
    expect(unshared.status).toBe(200);
    expect(await stored()).toEqual([]);
    expect((await env.FILES.list({ prefix: `previews/m/${id}/` })).objects).toEqual([]);
    expect((await call(`/v1/monster-page/${id}`)).status).toBe(404);
  });
});

describe('GET /v1/monster-page/:id', () => {
  it('answers an unknown id with the contract’s not-found error', async () => {
    for (const path of ['/v1/monster-page/nobody-000000', '/v1/shared-card/nobody']) {
      const response = await call(path);
      expect(response.status).toBe(404);
      expect(await wireErrorOf(response)).toMatchObject({ code: 'not_found', retryable: false });
    }
  });

  it('renders a 1200 by 630 PNG preview, and a new one once the monster is caught', async () => {
    const vietnamese = { ...written, language: 'vi', name: 'Răng Hàm, Chúa Tể Thứ Năm' } as const;
    const { response } = await share({
      ...vietnamese,
      signature: await signWords(shareSecret, { ...vietnamese, title: '' }),
    });
    const { id } = await response.json<{ id: string }>();
    expect(id).toMatch(/^rang-/);

    const preview = await call(`/v1/monster-page/${id}/preview.png`);
    expect(preview.status).toBe(200);
    expect(preview.headers.get('Content-Type')).toBe('image/png');
    const bytes = new DataView(await preview.arrayBuffer());
    expect(bytes.getUint32(0)).toBe(0x89504e47);
    expect([bytes.getUint32(16), bytes.getUint32(20)]).toEqual([1200, 630]);

    await env.DB.prepare('UPDATE shared_monsters SET caught_at = ?, catch_minutes = 9 WHERE id = ?')
      .bind('2026-10-07T07:52:00.000Z', id)
      .run();
    expect(await (await call(`/v1/monster-page/${id}`)).json()).toMatchObject({
      status: 'caught',
      catchMinutes: 9,
    });
    await call(`/v1/monster-page/${id}/preview.png`);
    const kept = (await env.FILES.list({ prefix: `previews/m/${id}/` })).objects.map((o) => o.key);
    expect(kept.sort()).toEqual([`previews/m/${id}/caught-9.png`, `previews/m/${id}/wild.png`]);
  });
});

describe('GET /v1/shared-card/:id', () => {
  it('shows only what the sharer chose to show', async () => {
    const payload = {
      card: {
        monster: {
          bodyType: 'tooth',
          seed: 'dentist',
          ink: 'lilac',
          size: 1,
          eyes: { count: 3, style: 'matched' },
          mouth: 'fangs',
          horns: 'none',
          antennae: 0,
          legs: 'none',
        },
        name: 'Molar, Keeper of Thursday',
        title: 'Inbox dweller',
        rarity: 'uncommon',
        number: 41,
        taskLine: null,
        daysLurked: 214,
        catchMinutes: 9,
        dread: 4,
        flavourText: 'Lives in the inbox. Pays no rent.',
        finish: 'paper',
        caughtOn: '2026-10-06',
      },
      sharerName: null,
      headline: null,
    };
    await env.DB.prepare(
      'INSERT INTO shared_cards (id, kind, language, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind('molar-041', 'card', 'en', JSON.stringify(payload), '2026-10-06T08:00:00.000Z')
      .run();

    const response = await call('/v1/shared-card/molar-041');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'molar-041', kind: 'card', ...payload });
    // A card is not a story: the other page does not show it.
    expect((await call('/v1/shared-story/molar-041')).status).toBe(404);
  });
});
