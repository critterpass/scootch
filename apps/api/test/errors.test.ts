import { describe, expect, it } from 'vitest';

import type { RouteDefinition } from '../src/route';

import { call, wireErrorOf } from './support';

const brokenRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/broken',
  access: 'public',
  handle: () => {
    throw new TypeError('a detail that must stay on the server');
  },
};

describe('every failure answers in the wire error shape', () => {
  it('an unknown route is not_found', async () => {
    const response = await call('/v1/nowhere');

    expect(response.status).toBe(404);
    expect(await wireErrorOf(response)).toMatchObject({ code: 'not_found', retryable: false });
    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('a thrown error is internal and keeps its text on the server', async () => {
    const response = await call('/v1/broken', {}, [brokenRoute]);

    expect(response.status).toBe(500);
    const error = await wireErrorOf(response);
    expect(error.code).toBe('internal');
    expect(JSON.stringify(error)).not.toContain('must stay on the server');
    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('a body that fails validation is bad_request and names the field, not the value', async () => {
    const response = await call('/v1/devices', {
      method: 'POST',
      body: { language: 'a made-up language' },
    });

    expect(response.status).toBe(400);
    const error = await wireErrorOf(response);
    expect(error).toMatchObject({ code: 'bad_request', retryable: false });
    expect(error.detail).toEqual({ issues: [expect.objectContaining({ path: 'language' })] });
    expect(JSON.stringify(error)).not.toContain('made-up');
  });

  it('a body that is not JSON is bad_request', async () => {
    const response = await call('/v1/devices', { method: 'POST', rawBody: '{not json' });

    expect(response.status).toBe(400);
    expect((await wireErrorOf(response)).code).toBe('bad_request');
  });
});

describe('health', () => {
  it('reports the commit, the environment and a database that answers', async () => {
    const response = await call('/v1/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ commit: 'local', environment: 'dev', database: 'ok' });
  });
});
