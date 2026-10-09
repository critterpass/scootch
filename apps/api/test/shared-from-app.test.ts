import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sharedCard } from '../../web/tests/shared-fixtures';
import { createApp } from '../src/app';
import * as routes from '../src/routes/index.generated';
import { signWords } from '../src/sharing/signed-words';

import { connectionDrops, providers } from './ai-providers';
import { call, freshIp, registerDevice, shareSecret, wireErrorOf } from './support';
import { jevDecides } from './task-create-support';

const taskLine = 'email the dentist about the thing nobody should read';
const card = { ...sharedCard.card, taskLine };
const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
/** What the task call gave with the card's words when it wrote them. */
const signature = await signWords(shareSecret, {
  name: card.name,
  title: card.title,
  flavourText: card.flavourText,
  seed: card.monster.seed,
  language: 'en',
});

type Sent = { method?: string; body?: unknown; unshareToken?: string };

/** One request as a phone, with the screen answered at the network boundary. */
async function asPhone(
  device: string,
  path: string,
  { method = 'POST', body, unshareToken }: Sent = {},
  screen: Parameters<typeof jevDecides>[0] = ordinary,
) {
  const doubles = providers({ jev: jevDecides(screen), deepseek: connectionDrops });
  vi.stubGlobal('fetch', doubles.fetch);
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test${path}`, {
      method,
      headers: {
        'CF-Connecting-IP': freshIp(),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${device}`,
        ...(unshareToken === undefined ? {} : { 'X-Unshare-Token': unshareToken }),
      },
      body: body === undefined ? null : JSON.stringify(body),
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

const post = (kind: 'card' | 'story', shown: Record<string, unknown> = card, screen = 'pass') => ({
  kind,
  language: 'en',
  card: shown,
  screen,
  signature,
});

async function stored(table = 'shared_cards'): Promise<Record<string, unknown>[]> {
  return (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;
}

async function refusedAsNotForThisTask(response: Response): Promise<void> {
  expect(response.status).toBe(400);
  expect(await wireErrorOf(response)).toMatchObject({
    code: 'bad_request',
    retryable: false,
    detail: { reason: 'not_for_this_task' },
  });
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await env.DB.prepare('DELETE FROM shared_cards').run();
  await env.DB.prepare('DELETE FROM shared_monsters').run();
});

describe('POST /v1/card-share', () => {
  it('stores a card with its task line when it was left showing, and nothing about the phone', async () => {
    const device = await registerDevice();
    const { response, doubles } = await asPhone(device, '/v1/card-share', { body: post('card') });

    expect(response.status).toBe(200);
    const { id, unshareToken } = await response.json<{ id: string; unshareToken: string }>();
    const rows = await stored();
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
      ['created_at', 'id', 'kind', 'language', 'payload', 'unshare_token_hash'].sort(),
    );
    expect(JSON.parse(String(rows[0]?.['payload']))).toEqual({
      card,
      sharerName: null,
      headline: null,
    });
    const kept = JSON.stringify(rows);
    expect(kept).not.toContain(unshareToken);
    expect(kept).not.toContain(device);
    const devices = await stored('devices');
    for (const value of devices.flatMap((row) => Object.values(row))) {
      if (typeof value === 'string' && value.length >= 16) expect(kept).not.toContain(value);
    }
    // What the person typed went through the screen; the server's own words did not.
    expect(doubles.sent.jev.length).toBeGreaterThan(0);
    expect(JSON.stringify(doubles.sent.jev[0])).toContain(taskLine);
    for (const own of [card.name, card.title, card.flavourText]) {
      expect(JSON.stringify(doubles.sent.jev)).not.toContain(own);
    }

    const page = await call(`/v1/shared-card/${id}`);
    expect(page.status).toBe(200);
    expect(await page.json()).toEqual({
      id,
      kind: 'card',
      language: 'en',
      sharedAt: rows[0]?.['created_at'],
      sharerName: null,
      headline: null,
      card,
    });
  });

  it('keeps no task text when the sharer hid it, in the row or on the page', async () => {
    const device = await registerDevice();
    const hidden = { ...card, taskLine: null };
    const { response, doubles } = await asPhone(device, '/v1/card-share', {
      body: post('card', hidden),
    });

    const { id } = await response.json<{ id: string }>();
    // Nothing the person typed is on the page, so the screen is not asked at all.
    expect(doubles.sent.jev).toEqual([]);
    expect(JSON.stringify(await stored())).not.toContain('dentist about');
    const page = await (await call(`/v1/shared-card/${id}`)).text();
    expect(page).not.toContain('dentist about');
    expect(JSON.parse(page)).toMatchObject({ card: { taskLine: null } });
  });

  it('never keeps the task line of a story, whose page does not show it', async () => {
    const device = await registerDevice();
    const { response, doubles } = await asPhone(device, '/v1/card-share', { body: post('story') });

    const { id } = await response.json<{ id: string }>();
    expect(JSON.stringify(await stored())).not.toContain('dentist about');
    expect(doubles.sent.jev).toEqual([]);
    const page = await call(`/v1/shared-story/${id}`);
    expect(await page.json()).toMatchObject({ kind: 'story', card: { taskLine: null } });
    expect((await call(`/v1/shared-card/${id}`)).status).toBe(404);
  });

  it('keeps a guess from the guess sheet with the card and gives it back with the page', async () => {
    const device = await registerDevice();
    for (const [kind, read] of [
      ['story', 'shared-story'],
      ['card', 'shared-card'],
    ] as const) {
      const guessed = { ...card, taskLine: null, guessMinutes: 120 };
      const { response } = await asPhone(device, '/v1/card-share', { body: post(kind, guessed) });
      expect(response.status).toBe(200);
      const { id } = await response.json<{ id: string }>();
      const page = await (await call(`/v1/${read}/${id}`)).json();
      expect(page).toMatchObject({ kind, card: { guessMinutes: 120, catchMinutes: 9 } });
    }
  });

  it('gives back a card shared without a guess with no guess at all', async () => {
    const device = await registerDevice();
    const { response } = await asPhone(device, '/v1/card-share', { body: post('story') });
    const { id } = await response.json<{ id: string }>();
    const page = await (await call(`/v1/shared-story/${id}`)).json<{ card: object }>();
    expect(page.card).not.toHaveProperty('guessMinutes');
  });

  it('reads a page stored before guesses were kept as it always was', async () => {
    await env.DB.prepare(
      `INSERT INTO shared_cards (id, kind, language, payload, created_at)
       VALUES ('molar-old', 'story', 'en', ?, '2026-10-06T08:00:00.000Z')`,
    )
      .bind(JSON.stringify({ card: sharedCard.card, sharerName: null, headline: null }))
      .run();
    const page = await call('/v1/shared-story/molar-old');
    expect(page.status).toBe(200);
    expect(await page.json()).toMatchObject({ card: sharedCard.card });
  });

  it.each([45, 0, -30, 121, '120', null, 99999])(
    'refuses a guess that is not one of the guess sheet’s steps (%j)',
    async (guessMinutes) => {
      const device = await registerDevice();
      const { response } = await asPhone(device, '/v1/card-share', {
        body: post('story', { ...card, guessMinutes }),
      });
      expect(response.status).toBe(400);
      expect(await stored()).toEqual([]);
    },
  );

  it('has no field for a name, an account or anything else beside the card', async () => {
    const device = await registerDevice();
    for (const extra of [{ sharerName: 'Priya' }, { accountId: 'a' }, { headline: 'x' }]) {
      const { response } = await asPhone(device, '/v1/card-share', {
        body: { ...post('card'), ...extra },
      });
      expect(response.status).toBe(400);
    }
    const { response } = await asPhone(device, '/v1/card-share', {
      body: post('card', { ...card, taskId: 'task-1' }),
    });
    expect(response.status).toBe(400);
    expect(await stored()).toEqual([]);
  });

  it.each(['serious', 'crisis', 'reject'])(
    'refuses a task the phone stored as %s, before any model is asked',
    async (screen) => {
      const device = await registerDevice();
      const { response, doubles } = await asPhone(device, '/v1/card-share', {
        body: post('card', card, screen),
      });

      await refusedAsNotForThisTask(response);
      expect(doubles.sent.jev).toEqual([]);
      expect(await stored()).toEqual([]);
    },
  );

  it.each([
    ['crisis', { pass: 0.05, serious: 0.15, crisis: 0.8 }],
    ['serious', { pass: 0.2, serious: 0.78, crisis: 0.02 }],
  ] as const)(
    'refuses words the screen reads as %s, whatever the phone said',
    async (_, screen) => {
      const device = await registerDevice();
      const { response } = await asPhone(device, '/v1/card-share', { body: post('card') }, screen);

      await refusedAsNotForThisTask(response);
      expect(await stored()).toEqual([]);
    },
  );

  it('stores nothing when no model could screen the words', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const device = await registerDevice();
    const { response } = await asPhone(
      device,
      '/v1/card-share',
      { body: post('card') },
      connectionDrops,
    );

    await refusedAsNotForThisTask(response);
    expect(await stored()).toEqual([]);
  });

  it('is for a registered phone only', async () => {
    const response = await call('/v1/card-share', { method: 'POST', body: post('card') });
    expect(response.status).toBe(401);
    expect(await stored()).toEqual([]);
  });
});

describe('DELETE /v1/card-share/:id', () => {
  it('takes the page down with the token, and not with a wrong one or none', async () => {
    const device = await registerDevice();
    const { response } = await asPhone(device, '/v1/card-share', { body: post('story') });
    const { id, unshareToken } = await response.json<{ id: string; unshareToken: string }>();

    for (const wrong of ['x'.repeat(43), undefined]) {
      const refused = await asPhone(device, `/v1/card-share/${id}`, {
        method: 'DELETE',
        ...(wrong === undefined ? {} : { unshareToken: wrong }),
      });
      expect(refused.response.status).toBe(400);
      expect(await wireErrorOf(refused.response)).toMatchObject({
        detail: { reason: 'not_yours' },
      });
    }
    expect(await stored()).toHaveLength(1);
    expect((await call(`/v1/shared-story/${id}`)).status).toBe(200);

    const unshared = await asPhone(device, `/v1/card-share/${id}`, {
      method: 'DELETE',
      unshareToken,
    });
    expect(unshared.response.status).toBe(200);
    expect(await stored()).toEqual([]);
    const gone = await call(`/v1/shared-story/${id}`);
    expect(gone.status).toBe(404);
    expect(await wireErrorOf(gone)).toMatchObject({ code: 'not_found' });
  });
});

describe('POST /v1/monster-page/:id/caught', () => {
  const made = {
    seed: 'dentist',
    name: 'Molar, Keeper of Thursday',
    flavourText: 'Lives in the inbox. Pays no rent.',
    language: 'en',
  } as const;

  async function sharedMonster() {
    const doubles = providers({ jev: jevDecides(ordinary), deepseek: connectionDrops });
    vi.stubGlobal('fetch', doubles.fetch);
    const ctx = createExecutionContext();
    const response = await createApp(Object.values(routes)).fetch(
      new Request('https://api.test/v1/monster-share', {
        method: 'POST',
        headers: { 'CF-Connecting-IP': freshIp(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...made,
          bodyType: 'tooth',
          signature: await signWords(shareSecret, { ...made, title: '' }),
        }),
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
    return response.json<{ id: string; unshareToken: string }>();
  }

  it('turns the page to caught for the owner’s token only, and the first catch stands', async () => {
    const device = await registerDevice();
    const { id, unshareToken } = await sharedMonster();
    const caught = `/v1/monster-page/${id}/caught`;

    for (const wrong of ['x'.repeat(43), device, undefined]) {
      const refused = await asPhone(device, caught, {
        body: { catchMinutes: 9 },
        ...(wrong === undefined ? {} : { unshareToken: wrong }),
      });
      expect(refused.response.status).toBe(400);
      expect(await wireErrorOf(refused.response)).toMatchObject({
        detail: { reason: 'not_yours' },
      });
    }
    expect(await (await call(`/v1/monster-page/${id}`)).json()).toMatchObject({
      status: 'wild',
      caughtAt: null,
    });

    const told = await asPhone(device, caught, { body: { catchMinutes: 9 }, unshareToken });
    expect(told.response.status).toBe(200);
    const page = await (await call(`/v1/monster-page/${id}`)).json<{ caughtAt: string }>();
    expect(page).toMatchObject({ status: 'caught', catchMinutes: 9 });

    await asPhone(device, caught, { body: { catchMinutes: 25 }, unshareToken });
    expect(await (await call(`/v1/monster-page/${id}`)).json()).toEqual(page);

    const nobody = await asPhone(device, '/v1/monster-page/nobody-000000/caught', {
      body: { catchMinutes: 9 },
      unshareToken,
    });
    expect(nobody.response.status).toBe(404);
  });
});
