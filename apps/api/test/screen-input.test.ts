import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { screenInputResponseSchema } from '../src/contracts';
import { hashDeviceToken } from '../src/device-auth';
import * as routes from '../src/routes/index.generated';

import {
  answersStatus,
  connectionDrops,
  deepseekAnswers,
  jevAnswers,
  providers,
  timesOut,
  type Providers,
} from './ai-providers';
import { call, freshIp, registerDevice, wireErrorOf } from './support';

const secretText = 'a private note nobody else should ever read';

/** Sends one text to the screen with both provider keys set and the providers replaced. */
async function screen(doubles: Providers, text = secretText) {
  vi.stubGlobal('fetch', doubles.fetch);
  const token = await registerDevice();
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/screen-input', {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': freshIp(),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language: 'en', text, source: 'typed' }),
    }),
    { ...env, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  expect(response.status).toBe(200);
  return { token, body: screenInputResponseSchema.parse(await response.json()) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /v1/screen-input', () => {
  it('needs a registered device', async () => {
    const response = await call('/v1/screen-input', {
      method: 'POST',
      body: { language: 'en', text: secretText, source: 'typed' },
    });

    expect(response.status).toBe(401);
  });

  it.each([
    ['an unknown source', { language: 'en', text: secretText, source: 'email' }],
    ['a missing language', { text: secretText, source: 'typed' }],
    ['text that is not a string', { language: 'en', text: [secretText], source: 'typed' }],
    ['text over the limit', { language: 'vi', text: secretText.repeat(100), source: 'ramble' }],
  ])('rejects %s in the wire error shape without echoing the text', async (_, body) => {
    const token = await registerDevice();

    const response = await call('/v1/screen-input', { method: 'POST', token, body });

    expect(response.status).toBe(400);
    const raw = await response.clone().text();
    expect(raw).not.toContain(secretText);
    expect(await wireErrorOf(response)).toMatchObject({ code: 'bad_request', retryable: false });
  });

  it('answers pass for an ordinary note and sends Jev nothing but the text', async () => {
    const doubles = providers({
      jev: jevAnswers({ pass: 0.99, serious: 0.01, crisis: 0 }),
      deepseek: connectionDrops,
    });

    const { body } = await screen(doubles);

    expect(body).toEqual({
      verdict: 'pass',
      confidence: 0.99,
      lowConfidence: false,
      answeredBy: 'jev',
    });
    expect(Object.keys(doubles.sent.jev[0] ?? {}).sort()).toEqual(['model', 'questions', 'state']);
    expect(doubles.sent.jev[0]?.['state']).toBe(secretText);
  });

  it('answers crisis as soon as the crisis probability reaches the threshold', async () => {
    const doubles = providers({
      jev: jevAnswers({ pass: 0.85, serious: 0.03, crisis: 0.12 }),
      deepseek: connectionDrops,
    });

    const { body } = await screen(doubles);

    expect(body).toMatchObject({ verdict: 'crisis', lowConfidence: true, answeredBy: 'jev' });
  });

  it('answers reject for a text that is not a note, and never in place of a crisis', async () => {
    const jev = (care: { pass: number; serious: number; crisis: number }) =>
      providers({
        jev: ({ body }) => {
          const questions = body['questions'] as { answer: { criteria: Record<string, string> } };
          const probabilities =
            'crisis' in questions.answer.criteria ? care : { genuine: 0.04, misuse: 0.96 };
          const [choice] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0] ?? [];
          return Response.json({
            model: 'jev-1.13.0',
            answers: { answer: { type: 'choice', choice, confidence: 0.96, probabilities } },
            usage: { input_tokens: 498, output_tokens: 40 },
          });
        },
        deepseek: answersStatus(503),
      });

    const misuse = await screen(jev({ pass: 0.97, serious: 0.02, crisis: 0.01 }));
    expect(misuse.body).toMatchObject({ verdict: 'reject', answeredBy: 'jev' });
    // An instruction to the app seldom earns a sure pass: caution alone does not keep it serious.
    const unsure = await screen(jev({ pass: 0.86, serious: 0.1, crisis: 0.04 }));
    expect(unsure.body.verdict).toBe('reject');

    const danger = await screen(jev({ pass: 0.5, serious: 0.1, crisis: 0.4 }));
    expect(danger.body.verdict).toBe('crisis');
    const heavy = await screen(jev({ pass: 0.2, serious: 0.79, crisis: 0.01 }));
    expect(heavy.body.verdict).toBe('serious');
  });

  it('uses the fast tier when Jev times out', async () => {
    const doubles = providers({
      jev: timesOut,
      deepseek: deepseekAnswers({ probabilities: { pass: 0.05, serious: 0.9, crisis: 0.05 } }),
    });

    const { body } = await screen(doubles);

    expect(body).toMatchObject({ verdict: 'serious', answeredBy: 'fallback' });
  });

  it.each([
    ['both time out', timesOut, timesOut],
    ['both are down', answersStatus(529), answersStatus(503)],
    ['neither can be reached', connectionDrops, connectionDrops],
  ] as const)('answers serious, never pass, when %s', async (_, jev, deepseek) => {
    const { body } = await screen(providers({ jev, deepseek }));

    expect(body).toEqual({
      verdict: 'serious',
      confidence: 0,
      lowConfidence: true,
      answeredBy: 'default',
    });
  });

  it('keeps the text out of the logs and the database', async () => {
    const logged: unknown[][] = [];
    for (const level of ['log', 'info', 'warn', 'error'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logged.push(args));
    }

    const answered = await screen(
      providers({ jev: jevAnswers({ pass: 1, serious: 0, crisis: 0 }), deepseek: timesOut }),
    );
    await screen(providers({ jev: timesOut, deepseek: timesOut }));

    expect(JSON.stringify(logged)).not.toContain(secretText);
    const usage = await env.DB.prepare('SELECT * FROM ai_usage').all();
    expect(JSON.stringify(usage.results)).not.toContain(secretText);
    // The answered call is in the ledger under the route's id, tied to the device by hash only.
    expect(usage.results).toContainEqual(
      expect.objectContaining({
        route: 'screen.input',
        model: 'jev-1.13.0',
        device_hash: await hashDeviceToken(answered.token),
      }),
    );
  });
});
