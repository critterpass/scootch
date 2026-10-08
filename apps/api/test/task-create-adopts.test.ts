import {
  taskCreateNameResponseSchema,
  taskCreateResponseSchema,
  taskCreateStartResponseSchema,
  type TaskCreateStartPass,
} from '@scootch/domain';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { signWords } from '../src/sharing/signed-words';

import { connectionDrops } from './ai-providers';
import { call, registerDevice, shareSecret, wireErrorOf } from './support';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  writerAnswers,
  writerCalls,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const crisis = { pass: 0.01, serious: 0.01, crisis: 0.98 };
const picked = pickOutputOf(passFixture.response);
const written = linesOutputOf(passFixture.response);
const replies = (screen = ordinary) => ({
  jev: jevDecides(screen),
  deepseek: pickAnswers([picked], writerAnswers([written])),
});

/** A monster made on the website, as its page keeps it. */
const website = {
  id: 'm0nst3rpage1',
  seed: 'dentist-seed',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  language: 'en',
} as const;

async function putOnItsPage(caughtAt: string | null = null): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO shared_monsters
       (id, seed, body_type, name, flavour_text, language, typed_line, unshare_token_hash,
        created_at, caught_at, catch_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      website.id,
      website.seed,
      website.bodyType,
      website.name,
      website.flavourText,
      website.language,
      passFixture.request.text.slice(0, 80),
      'not-a-real-hash',
      '2026-10-08T10:00:00.000Z',
      caughtAt,
      caughtAt === null ? null : 9,
    )
    .run();
}

/** Stage one for the recorded text, saying which monster's page it came from. */
async function start(monsterPage: string, screen = ordinary) {
  const device = await registerDevice();
  const stageOne = await createTask(
    replies(screen),
    { ...passFixture.request, staged: true, monsterPage },
    { device },
  );
  expect(stageOne.response.status).toBe(200);
  return { device, body: taskCreateStartResponseSchema.parse(JSON.parse(stageOne.raw)) };
}

async function nameFor(device: string, body: TaskCreateStartPass, deepseek = replies().deepseek) {
  const named = await createTask(
    { jev: jevDecides(ordinary), deepseek },
    { continuation: body.continuation.token },
    { path: '/v1/task-create/name', device },
  );
  expect(named.response.status).toBe(200);
  return { named, name: taskCreateNameResponseSchema.parse(JSON.parse(named.raw)) };
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await env.DB.prepare('DELETE FROM shared_monsters').run();
});

describe('a thing that arrives from a website monster', () => {
  it('keeps that monster: its body at stage one, then its name, card line and seed', async () => {
    await putOnItsPage();
    const { device, body } = await start(website.id);
    if (body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
    expect(body.labels.bodyType).toBe(website.bodyType);

    const { named, name } = await nameFor(device, body);
    expect(name.monster).toMatchObject({
      name: website.name,
      flavourText: website.flavourText,
      title: written.title,
    });
    expect(name.hatch).toBe(written.hatch);
    // The words are signed again, over the monster's own seed and the kind line just written.
    expect(name.monster.signed).toEqual({
      seed: website.seed,
      language: website.language,
      signature: await signWords(shareSecret, {
        name: website.name,
        title: written.title,
        flavourText: website.flavourText,
        seed: website.seed,
        language: website.language,
      }),
    });
    // One small writer call, told the monster's name and asked for no other.
    const calls = writerCalls(named.doubles);
    expect(calls).toHaveLength(1);
    expect((calls[0]?.['tools'] as { name: string }[])[0]?.name).toBe('write_kind_and_hatch');
    expect(JSON.stringify(calls[0])).toContain(website.name);

    // The pack is then written about that same name.
    const packed = await createTask(
      replies(),
      { continuation: name.continuation.token },
      { path: '/v1/task-create/pack', device },
    );
    expect(packed.response.status).toBe(200);
    expect(JSON.stringify(writerCalls(packed.doubles))).toContain(website.name);
  });

  it('keeps the name when the writer gives nothing', async () => {
    await putOnItsPage();
    const { device, body } = await start(website.id);
    if (body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
    const { name } = await nameFor(device, body, connectionDrops);
    expect(name.monster.name).toBe(website.name);
    expect(name.monster.flavourText).toBe(website.flavourText);
    expect(name.monster.signed?.seed).toBe(website.seed);
    expect(name.monster.title.length).toBeGreaterThan(0);
  });

  it('keeps it in the single call too', async () => {
    await putOnItsPage();
    const whole = await createTask(replies(), { ...passFixture.request, monsterPage: website.id });
    const body = taskCreateResponseSchema.parse(JSON.parse(whole.raw));
    if (body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
    expect(body.labels.bodyType).toBe(website.bodyType);
    expect(body.monster.name).toBe(website.name);
    expect(body.monster.signed?.seed).toBe(website.seed);
  });

  it('hatches as any other thing when the page names no wild monster', async () => {
    await putOnItsPage('2026-10-08T11:00:00.000Z');
    for (const page of [website.id, 'no-such-page']) {
      const { device, body } = await start(page);
      if (body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
      expect(body.labels.bodyType).toBe(passFixture.response.labels.bodyType);
      const { named, name } = await nameFor(device, body);
      expect(name.monster.name).toBe(passFixture.response.monster.name);
      expect(name.monster.signed?.seed).not.toBe(website.seed);
      const [call] = writerCalls(named.doubles);
      expect((call?.['tools'] as { name: string }[])[0]?.name).toBe('write_name');
    }
  });

  it('keeps the kind line with the page, and gives a second arrival the same one', async () => {
    await putOnItsPage();
    const first = await start(website.id);
    if (first.body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
    const one = await nameFor(first.device, first.body);
    const page = await (await call(`/v1/monster-page/${website.id}`)).json<{ title: string }>();
    expect(page.title).toBe(one.name.monster.title);

    // Another phone, and a writer that would now give another kind line: it is not asked for one.
    const second = await start(website.id);
    if (second.body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
    const two = await nameFor(
      second.device,
      second.body,
      writerAnswers([{ ...written, title: 'Another kind entirely' }]),
    );
    expect(two.name.monster.title).toBe(one.name.monster.title);
    const [asked] = writerCalls(two.named.doubles);
    expect(JSON.stringify(asked?.['tools'])).not.toContain('title');
  });

  it('lets the phone that took the monster in mark its page caught, and no other phone', async () => {
    await putOnItsPage();
    const { device, body } = await start(website.id);
    if (body.verdict !== 'pass') throw new Error('the recorded text passes the screen');
    await nameFor(device, body);
    const caught = { method: 'POST', body: { catchMinutes: 10 } } as const;

    const stranger = await call(`/v1/monster-page/${website.id}/caught`, {
      ...caught,
      token: await registerDevice(),
    });
    expect(stranger.status).toBe(400);
    expect(await wireErrorOf(stranger)).toMatchObject({ detail: { reason: 'not_yours' } });

    const mine = await call(`/v1/monster-page/${website.id}/caught`, { ...caught, token: device });
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({ status: 'caught', catchMinutes: 10 });
  });

  it('gives a crisis text no monster, whatever page it names', async () => {
    await putOnItsPage();
    const { body } = await start(website.id, crisis);
    expect(body.verdict).toBe('crisis');
    expect(body).not.toHaveProperty('labels');
    expect(body).not.toHaveProperty('continuation');
  });
});
