import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { MONSTER_BODY_TYPE_IDS } from '@scootch/domain';
import { offlineLine, offlinePacks } from '@scootch/voice';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApp } from '../src/app';
import * as routes from '../src/routes/index.generated';

import { connectionDrops, providers, timesOut, type Reply } from './ai-providers';
import { freshIp, wireErrorOf } from './support';
import { jevDecides, passFixture, writerAnswers, writerCalls } from './task-create-support';

const secretText = 'ring the landlord about the boiler nobody else should read';
const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const words = {
  name: passFixture.response.monster.name,
  flavourText: passFixture.response.monster.flavourText,
};

const monsterSchema = z.strictObject({
  verdict: z.literal('pass'),
  result: z.literal('monster'),
  seed: z.string().min(1).max(64),
  bodyType: z.enum(MONSTER_BODY_TYPE_IDS),
  name: z.string().min(1).max(60),
  flavourText: z.string().min(1).max(160),
});

/** Sends one maker request with both provider keys set and the providers replaced. */
async function make(
  replies: { jev: Reply; deepseek: Reply },
  body: unknown = { text: secretText, language: 'en' },
  ip = freshIp(),
) {
  const doubles = providers(replies);
  vi.stubGlobal('fetch', doubles.fetch);
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/monster-make', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { ...env, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return { doubles, response, raw: await response.clone().text() };
}

function logSpies() {
  return (['log', 'info', 'warn', 'error'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => {}),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /v1/monster-make', () => {
  it.each([
    ['crisis', { pass: 0.05, serious: 0.15, crisis: 0.8 }],
    ['serious', { pass: 0.2, serious: 0.78, crisis: 0.02 }],
  ] as const)(
    'answers a %s text with the verdict alone and never a monster',
    async (verdict, p) => {
      const { doubles, response, raw } = await make({
        jev: jevDecides(p),
        deepseek: writerAnswers([words]),
      });

      expect(response.status).toBe(200);
      expect(JSON.parse(raw)).toEqual({ verdict });
      expect(doubles.sent.deepseek).toEqual([]);
      // Only the screen's three questions were asked: no body type and no name for a heavy text.
      expect(doubles.sent.jev).toHaveLength(3);
    },
  );

  it('counts a text nobody could screen as serious', async () => {
    const spies = logSpies();
    const { response, raw } = await make({ jev: jevDecides(timesOut), deepseek: connectionDrops });

    expect(response.status).toBe(200);
    expect(JSON.parse(raw)).toEqual({ verdict: 'serious' });
    expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toContain(secretText);
  });

  it('hatches an ordinary text into a seed, a body, a name and a card line without echoing or logging the text', async () => {
    const spies = logSpies();
    const { doubles, response, raw } = await make({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([words]),
    });

    expect(response.status).toBe(200);
    expect(monsterSchema.parse(JSON.parse(raw))).toMatchObject({ bodyType: 'phone', ...words });
    expect(raw).not.toContain(secretText);
    expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toContain(secretText);
    // The writer got the voice guide and the text as data.
    const [sent] = writerCalls(doubles);
    expect(JSON.stringify(sent)).toContain('<note>');
  });

  it('asks the writer once more, then uses the offline name and line for what still fails', async () => {
    logSpies();
    const tooLong = { name: 'A name. With full stops!', flavourText: 'word '.repeat(40) };
    const { doubles, raw } = await make({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([tooLong, { ...tooLong, flavourText: words.flavourText }]),
    });

    expect(writerCalls(doubles)).toHaveLength(2);
    expect(monsterSchema.parse(JSON.parse(raw))).toMatchObject({
      name: offlinePacks.en.monsterNames[0],
      flavourText: words.flavourText,
    });
    expect(offlineLine('en', 'cheeky', 'flavourText')).not.toBe(words.flavourText);
  });

  it.each(['asdfghjkl', '!!!', 'zzzzzz', '7'])(
    'calls %s nonsense and writes nothing',
    async (text) => {
      const { doubles, raw } = await make(
        { jev: jevDecides(ordinary), deepseek: writerAnswers([words]) },
        { text, language: 'vi' },
      );

      expect(JSON.parse(raw)).toEqual({ verdict: 'pass', result: 'nonsense' });
      expect(doubles.sent.deepseek).toEqual([]);
    },
  );

  it('rejects a body that does not match, without echoing the text', async () => {
    const { response, raw } = await make(
      { jev: jevDecides(ordinary), deepseek: writerAnswers([words]) },
      { text: secretText, language: 'fr' },
    );

    expect(response.status).toBe(400);
    expect(raw).not.toContain(secretText);
  });

  it('naps for five minutes after twelve hatches from one address, and still screens', async () => {
    const ip = freshIp();
    const replies = () => ({ jev: jevDecides(ordinary), deepseek: writerAnswers([words]) });
    for (let hatch = 1; hatch <= 12; hatch += 1) {
      const { response } = await make(replies(), undefined, ip);
      expect(response.status, `hatch ${hatch}`).toBe(200);
    }

    const { doubles, response } = await make(replies(), undefined, ip);
    expect(response.status).toBe(429);
    const retryAfter = Number(response.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(240);
    expect(retryAfter).toBeLessThanOrEqual(300);
    expect(await wireErrorOf(response)).toMatchObject({
      code: 'rate_limited',
      retryable: true,
      detail: { retryAfterSeconds: retryAfter },
    });
    expect(doubles.sent.deepseek).toEqual([]);

    // A heavy text is still answered with care while the hatchery is closed.
    const heavy = await make(
      { jev: jevDecides({ pass: 0.05, serious: 0.15, crisis: 0.8 }), deepseek: connectionDrops },
      undefined,
      ip,
    );
    expect(JSON.parse(heavy.raw)).toEqual({ verdict: 'crisis' });

    // Another address is not napping.
    expect((await make(replies())).response.status).toBe(200);
  });
});
