import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import screenFixture from '../../../../packages/voice/fixtures/screen.input.en.json';
import taskFixture from '../../../../packages/voice/fixtures/task.create.en.json';

import { ApiClientError } from './api-error';
import { createHttpClient, type TokenStore } from './http-client';
import { createScootchApi } from './scootch-api';
import { createTaskClient } from './task-client';

const BASE_URL = 'https://api.test';
const TOKEN = 'a'.repeat(43);

interface Sent {
  readonly path: string;
  readonly authorization: string | null;
  readonly body: unknown;
}

type Answer = { status: number; body: unknown } | 'never';

/** A server that answers each request with the next recorded answer for its path. */
function fakeServer(answers: Record<string, Answer[]>) {
  const sent: Sent[] = [];
  const fetchFake = ((url: string, init: RequestInit) => {
    const path = url.replace(BASE_URL, '');
    sent.push({
      path,
      authorization: new Headers(init.headers).get('Authorization'),
      body: JSON.parse(init.body as string),
    });
    const answer = answers[path]?.shift();
    if (answer === undefined) return Promise.reject(new TypeError('Network request failed'));
    if (answer === 'never') {
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    }
    return Promise.resolve(
      new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as typeof fetch;
  return { fetch: fetchFake, sent };
}

function memoryTokens(initial: string | null = null): TokenStore & { current: string | null } {
  const store = {
    current: initial,
    read: () => Promise.resolve(store.current),
    write: (token: string) => {
      store.current = token;
      return Promise.resolve();
    },
  };
  return store;
}

function apiFor(answers: Record<string, Answer[]>, tokens = memoryTokens(TOKEN), timeoutMs = 50) {
  const server = fakeServer(answers);
  const http = createHttpClient({
    baseUrl: BASE_URL,
    fetch: server.fetch,
    tokens,
    language: () => 'en',
    timeoutMs,
  });
  return { ...server, http, api: createScootchApi(http), tokens };
}

const wireError = (code: string, retryable: boolean) => ({
  error: { code, message: `The server said ${code}`, retryable },
});
const failure = (work: Promise<unknown>) =>
  work.then(
    () => {
      throw new Error('expected the call to fail');
    },
    (error: unknown) => error as ApiClientError,
  );

// The client's own failure log is asserted on in the last test; here it is only kept quiet.
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('the API client', () => {
  it('registers the device on first use, keeps the token and sends it as a bearer', async () => {
    const { api, sent, tokens } = apiFor(
      {
        '/v1/devices': [{ status: 200, body: { token: TOKEN } }],
        '/v1/screen-input': [
          { status: 200, body: screenFixture.response },
          { status: 200, body: screenFixture.response },
        ],
      },
      memoryTokens(null),
    );
    const request = { language: 'en', text: 'Renew my passport', source: 'typed' } as const;

    expect(await api.screenInput(request)).toEqual(screenFixture.response);
    await api.screenInput(request);

    expect(sent.map((one) => one.path)).toEqual([
      '/v1/devices',
      '/v1/screen-input',
      '/v1/screen-input',
    ]);
    expect(sent[0]).toMatchObject({ authorization: null, body: { language: 'en' } });
    expect(sent[1]).toMatchObject({ authorization: `Bearer ${TOKEN}`, body: request });
    expect(tokens.current).toBe(TOKEN);
  });

  it('turns the contract error body into a typed error and does not send it again', async () => {
    const { api, sent } = apiFor({
      '/v1/screen-input': [{ status: 400, body: wireError('bad_request', false) }],
    });
    const error = await failure(api.screenInput({ language: 'en', text: 'x', source: 'typed' }));

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: 'bad_request', retryable: false, status: 400 });
    expect(sent).toHaveLength(1);
  });

  it('sends a request once more when the server marks the error retryable', async () => {
    const recovered = apiFor({
      '/v1/task-create': [
        { status: 503, body: wireError('model_unavailable', true) },
        { status: 200, body: taskFixture.response },
      ],
    });
    const call = await createTaskClient(recovered.api).createTask(
      taskFixture.request as Parameters<typeof recovered.api.taskCreate>[0],
    );
    expect(recovered.sent).toHaveLength(2);
    expect(call.first).toMatchObject({ verdict: 'pass', oneThing: taskFixture.response.oneThing });
    expect(await call.rest).toMatchObject({
      verdict: 'pass',
      monster: taskFixture.response.monster,
    });

    const stillDown = apiFor({
      '/v1/screen-input': [
        { status: 504, body: wireError('model_timeout', true) },
        { status: 504, body: wireError('model_timeout', true) },
        { status: 200, body: screenFixture.response },
      ],
    });
    const error = await failure(
      stillDown.api.screenInput({ language: 'en', text: 'x', source: 'typed' }),
    );
    expect(error).toMatchObject({ code: 'model_timeout', status: 504 });
    expect(stillDown.sent).toHaveLength(2);
  });

  it('gives up after the timeout, and reports no connection as its own error', async () => {
    const slow = apiFor({ '/v1/screen-input': ['never'] });
    const timedOut = await failure(slow.http.post('/v1/screen-input', {}, (json) => json));
    expect(timedOut).toMatchObject({ code: 'timeout', retryable: false });
    expect(slow.sent).toHaveLength(1);

    const offline = apiFor({});
    expect(await failure(offline.http.post('/v1/screen-input', {}, (json) => json))).toMatchObject({
      code: 'network',
    });
  });

  it('refuses an answer that does not match the contract', async () => {
    const { api } = apiFor({ '/v1/screen-input': [{ status: 200, body: { verdict: 'fine' } }] });
    expect(
      await failure(api.screenInput({ language: 'en', text: 'x', source: 'typed' })),
    ).toMatchObject({ code: 'bad_response' });
  });

  it('registers its token again when the server does not know it', async () => {
    const { api, sent } = apiFor({
      '/v1/screen-input': [
        { status: 401, body: wireError('unauthorized', false) },
        { status: 200, body: screenFixture.response },
      ],
      '/v1/devices': [{ status: 200, body: { token: TOKEN } }],
    });
    await api.screenInput({ language: 'en', text: 'x', source: 'typed' });
    expect(sent.map((one) => one.path)).toEqual([
      '/v1/screen-input',
      '/v1/devices',
      '/v1/screen-input',
    ]);
    expect(sent[1]?.body).toEqual({ language: 'en', token: TOKEN });
  });

  it('never logs what the user typed, whatever happens to the request', async () => {
    const typed = 'a very private thing about my landlord';
    const logged: unknown[] = [];
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args);
      });
    }
    const { api } = apiFor({
      '/v1/screen-input': [
        { status: 503, body: wireError('model_unavailable', true) },
        { status: 500, body: wireError('internal', false) },
        { status: 200, body: { verdict: 'fine' } },
        'never',
      ],
    });
    const request = { language: 'en', text: typed, source: 'typed' } as const;
    await failure(api.screenInput(request));
    await failure(api.screenInput(request));
    await failure(api.screenInput(request));

    expect(logged.length).toBeGreaterThan(0);
    expect(JSON.stringify(logged)).not.toContain('private');
    expect(JSON.stringify(logged)).not.toContain(TOKEN);
  });
});
