import { describe, expect, it } from '@jest/globals';

import { createHttpClient } from '../../api/http-client';

import { createBackupApi } from './backup-api';
import { TOKEN } from './test/sample-world';

const DEVICE_TOKEN = 'd'.repeat(43);

interface Sent {
  readonly method: string;
  readonly path: string;
  readonly authorization: string | null;
  readonly backupToken: string | null;
  readonly body: unknown;
}

/** The server at the network boundary, answering every request with one recorded answer. */
function apiAnswering(status: number, answer: unknown) {
  const sent: Sent[] = [];
  const fetchFake = ((url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    sent.push({
      method: init.method ?? 'GET',
      path: url.replace('https://api.test', ''),
      authorization: headers.get('Authorization'),
      backupToken: headers.get('X-Backup-Token'),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
    });
    return Promise.resolve(new Response(JSON.stringify(answer), { status }));
  }) as typeof fetch;
  const http = createHttpClient({
    baseUrl: 'https://api.test',
    fetch: fetchFake,
    tokens: { read: () => Promise.resolve(DEVICE_TOKEN), write: () => Promise.resolve() },
    language: () => 'en',
  });
  return { api: createBackupApi(http), sent };
}

describe('the backup routes', () => {
  it('reads a snapshot with the device bearer and the backup token, and no body', async () => {
    const snapshot = { version: 1 };
    const { api, sent } = apiAnswering(200, { snapshot, updatedAt: '2026-10-06T10:00:00.000Z' });
    expect(await api.get(TOKEN)).toEqual(snapshot);
    expect(sent).toEqual([
      {
        method: 'GET',
        path: '/v1/backup',
        authorization: `Bearer ${DEVICE_TOKEN}`,
        backupToken: TOKEN,
        body: null,
      },
    ]);
  });

  it('reads the not-found answer as no snapshot', async () => {
    const { api } = apiAnswering(404, {
      error: { code: 'not_found', message: 'No backup', retryable: false },
    });
    expect(await api.get(TOKEN)).toBeNull();
  });

  it('sends the backup token in the body of a data delete', async () => {
    const { api, sent } = apiAnswering(200, { deleted: true });
    await api.deleteData(TOKEN);
    await api.deleteData(null);
    await api.remove(TOKEN);
    expect(sent.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      { method: 'POST', path: '/v1/data-delete', body: { backupToken: TOKEN } },
      { method: 'POST', path: '/v1/data-delete', body: {} },
      { method: 'DELETE', path: '/v1/backup', body: null },
    ]);
  });
});
