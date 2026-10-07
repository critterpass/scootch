import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { speechModel, speechTokenUrl } from '../src/ai/elevenlabs';
import { createApp } from '../src/app';
import { speechTokenResponseSchema } from '../src/contracts';
import { hashDeviceToken } from '../src/device-auth';
import * as routes from '../src/routes/index.generated';

import { call, freshIp, registerDevice, wireErrorOf } from './support';

const apiKey = 'elevenlabs-test-key';

type Sent = { url: string; method: string; key: string | null; body: string };

/** ElevenLabs' token endpoint, answering as given and keeping what it was sent. */
function elevenLabs(answer: () => Response | Promise<Response>) {
  const sent: Sent[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    sent.push({
      url: request.url,
      method: request.method,
      key: request.headers.get('xi-api-key'),
      body: await request.text(),
    });
    return answer();
  };
  return { sent, fetch };
}

/** Asks for a pass as a registered device, with the key set or left out. */
async function ask(key: string | null = apiKey) {
  const token = await registerDevice();
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/speech-token', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': freshIp(), Authorization: `Bearer ${token}` },
    }),
    { ...env, ...(key === null ? {} : { ELEVENLABS_API_KEY: key }) },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return { token, response };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /v1/speech-token', () => {
  it('needs a registered device', async () => {
    const response = await call('/v1/speech-token', { method: 'POST' });

    expect(response.status).toBe(401);
  });

  it('hands the phone a single-use pass and never the key', async () => {
    const provider = elevenLabs(() => Response.json({ token: 'sutkn_once' }));
    vi.stubGlobal('fetch', provider.fetch);

    const { token, response } = await ask();

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(speechTokenResponseSchema.parse(JSON.parse(text))).toEqual({ token: 'sutkn_once' });
    expect(text).not.toContain(apiKey);
    // The provider is asked for a realtime pass, with the key in its header and nothing else.
    expect(provider.sent).toEqual([{ url: speechTokenUrl, method: 'POST', key: apiKey, body: '' }]);
    const row = await env.DB.prepare(
      'SELECT route, model, input_tokens, output_tokens, project FROM ai_usage WHERE device_hash = ?',
    )
      .bind(await hashDeviceToken(token))
      .first();
    expect(row).toEqual({
      route: 'speech.token',
      model: speechModel,
      input_tokens: 0,
      output_tokens: 0,
      project: 'scootch',
    });
  });

  it('says speech is unavailable, and asks nobody, when the key is not set', async () => {
    const provider = elevenLabs(() => Response.json({ token: 'sutkn_once' }));
    vi.stubGlobal('fetch', provider.fetch);

    const { response } = await ask(null);

    expect(response.status).toBe(503);
    expect((await wireErrorOf(response)).code).toBe('model_unavailable');
    expect(provider.sent).toEqual([]);
  });

  it('says speech is unavailable when the provider refuses, without passing on what it said', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      elevenLabs(() => Response.json({ detail: { message: `bad key ${apiKey}` } }, { status: 401 }))
        .fetch,
    );

    const { token, response } = await ask();

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain(apiKey);
    expect(JSON.parse(text)).toMatchObject({ error: { code: 'model_unavailable' } });
    const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM ai_usage WHERE device_hash = ?')
      .bind(await hashDeviceToken(token))
      .first<{ n: number }>();
    expect(used?.n).toBe(0);
  });
});
