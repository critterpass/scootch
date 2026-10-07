import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

import { wireErrorSchema, type WireError } from '../src/contracts';
import { expect } from 'vitest';

import { createApp } from '../src/app';
import type { RouteDefinition } from '../src/route';
import * as routes from '../src/routes/index.generated';

/** The secret the tests sign the server's own words with, set on every environment they build. */
export const shareSecret = 'share-test-secret';

let nextAddress = 1;

/** A sender address no other test has used, so one test's requests never count against another's. */
export function freshIp(): string {
  nextAddress += 1;
  return `203.0.113.${nextAddress}`;
}

export type Call = {
  method?: string;
  token?: string;
  ip?: string;
  body?: unknown;
  rawBody?: string;
};

/** Sends one request through the shipped routes plus any extra ones a test adds. */
export async function call(
  path: string,
  { method = 'GET', token, ip = freshIp(), body, rawBody }: Call = {},
  extraRoutes: readonly RouteDefinition[] = [],
): Promise<Response> {
  const headers = new Headers({ 'CF-Connecting-IP': ip });
  if (token !== undefined) headers.set('Authorization', `Bearer ${token}`);
  const payload = rawBody ?? (body === undefined ? undefined : JSON.stringify(body));
  if (payload !== undefined) headers.set('Content-Type', 'application/json');

  const app = createApp([...Object.values(routes), ...extraRoutes]);
  const ctx = createExecutionContext();
  const response = await app.fetch(
    new Request(`https://api.test${path}`, { method, headers, body: payload ?? null }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

/** The body of a failed call, which must be the contract's error shape. */
export async function wireErrorOf(response: Response): Promise<WireError['error']> {
  expect(response.headers.get('Content-Type')).toContain('application/json');
  return wireErrorSchema.parse(await response.json()).error;
}

export async function registerDevice(token?: string): Promise<string> {
  const response = await call('/v1/devices', {
    method: 'POST',
    body: { language: 'en', ...(token === undefined ? {} : { token }) },
  });
  expect(response.status).toBe(200);
  return (await response.json<{ token: string }>()).token;
}
