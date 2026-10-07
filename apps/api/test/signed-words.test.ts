import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { taskCreateNameResponseSchema, taskCreateStartResponseSchema } from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sharedCard } from '../../web/tests/shared-fixtures';
import { continuationSecret } from '../src/ai/task-create/continuation';
import { createApp } from '../src/app';
import * as routes from '../src/routes/index.generated';
import { shareSigningSecret, signWords } from '../src/sharing/signed-words';

import { connectionDrops, providers, type Reply } from './ai-providers';
import { freshIp, registerDevice, shareSecret, wireErrorOf } from './support';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  writerAnswers,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.2, serious: 0.78, crisis: 0.02 };
const keys = {
  TYPESAFE_API_KEY: 'jev-test-key',
  DEEPSEEK_API_KEY: 'deepseek-test-key',
  SHARE_SIGNING_SECRET: shareSecret,
};
const taskReplies = () => ({
  jev: jevDecides(ordinary),
  deepseek: pickAnswers(
    [pickOutputOf(passFixture.response)],
    writerAnswers([linesOutputOf(passFixture.response)]),
  ),
});

/** One request with the providers replaced at the network boundary, and what was sent to them. */
async function send(
  path: string,
  body: unknown,
  { device, jev = jevDecides(ordinary) }: { device?: string; jev?: Reply } = {},
) {
  const doubles = providers({ jev, deepseek: writerAnswers([makerWords]) });
  vi.stubGlobal('fetch', doubles.fetch);
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test${path}`, {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': freshIp(),
        'Content-Type': 'application/json',
        ...(device === undefined ? {} : { Authorization: `Bearer ${device}` }),
      },
      body: JSON.stringify(body),
    }),
    { ...env, ...keys },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  vi.unstubAllGlobals();
  return { doubles, response };
}

const makerWords = {
  name: passFixture.response.monster.name,
  flavourText: passFixture.response.monster.flavourText,
};

/** The staged task call as a phone makes it: stage one, then the monster's name. */
async function namedMonster() {
  const device = await registerDevice();
  const stageOne = await createTask(
    taskReplies(),
    { ...passFixture.request, staged: true },
    { device },
  );
  const start = taskCreateStartResponseSchema.parse(JSON.parse(stageOne.raw));
  if (start.verdict !== 'pass') throw new Error('the recorded task is an ordinary one');
  const named = await createTask(
    taskReplies(),
    { continuation: start.continuation.token },
    { path: '/v1/task-create/name', device },
  );
  vi.unstubAllGlobals();
  const { monster } = taskCreateNameResponseSchema.parse(JSON.parse(named.raw));
  if (monster.signed === undefined) throw new Error('the name answer carries no signature');
  return { device, monster, signed: monster.signed };
}

type Named = Awaited<ReturnType<typeof namedMonster>>;

/** The share a phone posts for a catch of that monster, with the task line hidden. */
function cardShare({ monster, signed }: Named, kind: 'card' | 'story' = 'story') {
  return {
    kind,
    language: signed.language as string,
    screen: 'pass',
    signature: signed.signature,
    card: {
      ...sharedCard.card,
      monster: { ...sharedCard.card.monster, seed: signed.seed },
      name: monster.name,
      title: monster.title,
      flavourText: monster.flavourText,
      taskLine: null as string | null,
    },
  };
}

async function stored(table: string): Promise<Record<string, unknown>[]> {
  return (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;
}

async function refusedAs(response: Response, reason: string): Promise<void> {
  expect(response.status).toBe(400);
  expect(await wireErrorOf(response)).toMatchObject({
    code: 'bad_request',
    retryable: false,
    detail: { reason },
  });
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await env.DB.prepare('DELETE FROM shared_cards').run();
  await env.DB.prepare('DELETE FROM shared_monsters').run();
});

describe('the words the task call signs', () => {
  it('are accepted by the card share as they came, with no screen call for them', async () => {
    const named = await namedMonster();
    expect(named.signed.seed).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    for (const kind of ['story', 'card'] as const) {
      const { response, doubles } = await send('/v1/card-share', cardShare(named, kind), named);
      expect(response.status).toBe(200);
      expect(doubles.sent.jev).toEqual([]);
      expect(doubles.sent.deepseek).toEqual([]);
    }
    expect(await stored('shared_cards')).toHaveLength(2);
  });

  it('are refused once any one of the name, title, card line, seed or language is changed', async () => {
    const named = await namedMonster();
    const good = cardShare(named);
    const changed = [
      { ...good, card: { ...good.card, name: `${good.card.name}!` } },
      { ...good, card: { ...good.card, title: 'Anything at all' } },
      { ...good, card: { ...good.card, flavourText: 'Words nobody at Scootch wrote.' } },
      { ...good, card: { ...good.card, monster: { ...good.card.monster, seed: 'dentist' } } },
      { ...good, language: 'vi' },
      { ...good, signature: `${good.signature.slice(0, -2)}AA` },
      { ...good, signature: undefined },
    ];
    for (const body of changed) {
      const { response, doubles } = await send('/v1/card-share', body, named);
      await refusedAs(response, 'words_not_signed');
      expect(doubles.sent.jev).toEqual([]);
    }
    expect(await stored('shared_cards')).toEqual([]);
  });

  it('are not vouched for by the continuation secret, which is a different key', async () => {
    const named = await namedMonster();
    const good = cardShare(named);
    const words = {
      name: good.card.name,
      title: good.card.title,
      flavourText: good.card.flavourText,
      seed: named.signed.seed,
      language: named.signed.language,
    };
    const other = continuationSecret(keys) ?? '';
    expect(other).not.toBe(shareSigningSecret(keys));

    const { response } = await send(
      '/v1/card-share',
      { ...good, signature: await signWords(other, words) },
      named,
    );
    await refusedAs(response, 'words_not_signed');
    // Without a secret of its own the share key is derived from the model key, under its own label.
    expect(shareSigningSecret({ DEEPSEEK_API_KEY: 'model' })).toBe('model');
    expect(shareSigningSecret({ SHARE_SIGNING_SECRET: '', DEEPSEEK_API_KEY: '' })).toBeUndefined();
  });

  it('still send a task line left showing through the screen, and a refused line refuses the share', async () => {
    const named = await namedMonster();
    const taskLine = 'email the dentist about the thing nobody should read';
    const shown = cardShare(named, 'card');
    const body = { ...shown, card: { ...shown.card, taskLine } };

    const fine = await send('/v1/card-share', body, named);
    expect(fine.response.status).toBe(200);
    const asked = JSON.stringify(fine.doubles.sent.jev);
    expect(asked).toContain(taskLine);
    expect(asked).not.toContain(shown.card.name);
    expect(asked).not.toContain(shown.card.flavourText);

    const refused = await send('/v1/card-share', body, { ...named, jev: jevDecides(heavy) });
    await refusedAs(refused.response, 'not_for_this_task');
    expect(await stored('shared_cards')).toHaveLength(1);
  });

  it('are not looked at for a task that is not a pass: that is refused before anything else', async () => {
    const named = await namedMonster();
    const { response, doubles } = await send(
      '/v1/card-share',
      { ...cardShare(named), screen: 'serious', signature: 'not-a-signature' },
      named,
    );
    await refusedAs(response, 'not_for_this_task');
    expect(doubles.sent.jev).toEqual([]);
  });
});

describe('the words the maker signs', () => {
  const typed = 'ring the landlord about the boiler';

  async function made() {
    const { response } = await send('/v1/monster-make', { text: typed, language: 'en' });
    const answer = await response.json<Record<string, string>>();
    expect(answer).toMatchObject({ result: 'monster', ...makerWords });
    const { seed = '', bodyType, name, flavourText, signature = '' } = answer;
    return { seed, bodyType, name, flavourText, language: 'en', signature };
  }

  it('are shared as they came with no screen call, and refused unsigned or altered', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const monster = await made();

    const shared = await send('/v1/monster-share', monster);
    expect(shared.response.status).toBe(200);
    expect(await shared.response.json()).toMatchObject({ verdict: 'pass' });
    expect(shared.doubles.sent.jev).toEqual([]);

    const { signature, ...unsigned } = monster;
    const altered = [
      unsigned,
      { ...monster, name: 'Anything, Published on Scootch' },
      { ...monster, flavourText: 'Words nobody at Scootch wrote.' },
      { ...monster, seed: 'another' },
      { ...monster, language: 'vi' },
      { ...monster, signature: `${signature.slice(0, -2)}AA` },
    ];
    for (const body of altered) {
      const { response, doubles } = await send('/v1/monster-share', body);
      await refusedAs(response, 'words_not_signed');
      expect(doubles.sent.jev).toEqual([]);
    }
    expect(await stored('shared_monsters')).toHaveLength(1);
  });

  it('still send the typed line through the screen when it is shown', async () => {
    const monster = await made();

    const heavyLine = await send(
      '/v1/monster-share',
      { ...monster, typed },
      { jev: jevDecides(heavy) },
    );
    expect(await heavyLine.response.json()).toEqual({ verdict: 'serious' });
    const asked = JSON.stringify(heavyLine.doubles.sent.jev);
    expect(asked).toContain(typed);
    expect(asked).not.toContain(monster.name);
    expect(await stored('shared_monsters')).toEqual([]);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unscreened = await send(
      '/v1/monster-share',
      { ...monster, typed },
      { jev: connectionDrops },
    );
    expect(await unscreened.response.json()).toEqual({ verdict: 'serious' });
  });
});
