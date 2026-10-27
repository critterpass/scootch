import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scribeTokenUrl } from '../src/ai/hearing-token';
import { hearingTokenResponseSchema } from '../src/contracts';
import { hashDeviceToken } from '../src/device-auth';

import { recordedRefusal, recordedToken } from './fixtures/elevenlabs/single-use-token';
import { as, call, count, registerDevice, wireErrorOf } from './support';

const accountKey = 'xi-account-key-that-stays-on-the-server';

type Sent = { url: string; headers: Headers; body: string };

/** ElevenLabs at the network boundary: `reply` answers the token endpoint, every call is kept. */
function elevenLabs(reply: () => Response | Promise<Response>): Sent[] {
  const sent: Sent[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== scribeTokenUrl) throw new Error(`unexpected request to ${url}`);
    sent.push({ url, headers: new Headers(init?.headers), body: String(init?.body ?? '') });
    return reply();
  });
  return sent;
}

/** Asks for a token as a new device, with the account key set, or with none for `null`. */
async function mint(key: string | null = accountKey) {
  const token = await registerDevice();
  const response = await as({ token }, 'POST', '/v1/hearing/token', undefined, {
    ...env,
    ELEVENLABS_API_KEY: key ?? undefined,
  });
  return { token, response };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /v1/hearing/token', () => {
  it('needs a registered device', async () => {
    const sent = elevenLabs(() => Response.json(recordedToken));

    const response = await call('/v1/hearing/token', { method: 'POST' });

    expect(response.status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it('hands the phone a single-use token for Scribe Realtime, naming no language', async () => {
    const sent = elevenLabs(() => Response.json(recordedToken));
    const before = Date.now();

    const { response } = await mint();

    expect(response.status).toBe(200);
    const body = hearingTokenResponseSchema.parse(await response.json());
    expect(body).toMatchObject({
      token: recordedToken.token,
      url: 'wss://api.elevenlabs.io/v1/speech-to-text/realtime',
      params: { model_id: 'scribe_v2_realtime', audio_format: 'pcm_16000', commit_strategy: 'vad' },
    });
    expect(Object.keys(body.params)).not.toContain('language_code');
    // Single-use tokens open a socket for fifteen minutes.
    const life = Date.parse(body.expiresAt) - before;
    expect(life).toBeGreaterThan(14 * 60_000);
    expect(life).toBeLessThanOrEqual(15 * 60_000 + 1_000);
    // The account's key goes to ElevenLabs alone, in its header, and never to the phone.
    expect(sent).toHaveLength(1);
    expect(sent[0]?.headers.get('xi-api-key')).toBe(accountKey);
    expect(JSON.stringify(body)).not.toContain(accountKey);
  });

  it('adds one row to the cost ledger per token, for the device that asked', async () => {
    elevenLabs(() => Response.json(recordedToken));

    const { token, response } = await mint();

    expect(response.status).toBe(200);
    const hash = await hashDeviceToken(token);
    expect(
      await count(
        "ai_usage WHERE route = 'hearing.token' AND model = 'scribe_v2_realtime' AND device_hash = ?",
        hash,
      ),
    ).toBe(1);
  });

  it('answers model_unavailable, asking nobody, while the key is not set', async () => {
    const sent = elevenLabs(() => Response.json(recordedToken));

    const { response } = await mint(null);

    expect(response.status).toBe(503);
    expect(await wireErrorOf(response)).toMatchObject({
      code: 'model_unavailable',
      retryable: true,
      detail: { reason: 'no_key' },
    });
    expect(sent).toHaveLength(0);
  });

  it('reports a refused key by its status alone, never with what ElevenLabs said', async () => {
    elevenLabs(() => Response.json(recordedRefusal, { status: 401 }));

    const { response } = await mint();

    expect(response.status).toBe(503);
    const raw = await response.clone().text();
    expect(raw).not.toContain('Invalid API key');
    expect(await wireErrorOf(response)).toMatchObject({
      code: 'model_unavailable',
      detail: { reason: 'status_401' },
    });
  });

  it('answers model_timeout when ElevenLabs is too slow, and model_unavailable when unreachable', async () => {
    elevenLabs(() => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    const slow = await mint();
    expect(slow.response.status).toBe(504);
    expect(await wireErrorOf(slow.response)).toMatchObject({ code: 'model_timeout' });

    vi.unstubAllGlobals();
    elevenLabs(() => {
      throw new TypeError('Network connection lost.');
    });
    const gone = await mint();
    expect(await wireErrorOf(gone.response)).toMatchObject({
      code: 'model_unavailable',
      detail: { reason: 'network' },
    });
  });

  it('refuses an answer with no token in it', async () => {
    elevenLabs(() => Response.json({ token: '' }));

    const { response } = await mint();

    expect(await wireErrorOf(response)).toMatchObject({
      code: 'model_unavailable',
      detail: { reason: 'bad_response' },
    });
  });
});
