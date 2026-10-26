import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

import { wireErrorSchema, type WireError } from '../src/contracts';
import { expect } from 'vitest';

import { createApp } from '../src/app';
import type { Bindings } from '../src/env';
import type { RouteDefinition } from '../src/route';
import * as routes from '../src/routes/index.generated';

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

/** One request through the shipped routes, as a device, with the bindings a test chooses. */
export async function as(
  device: { token: string } | undefined,
  method: string,
  path: string,
  body?: unknown,
  bindings: Bindings = env,
): Promise<Response> {
  const headers = new Headers({ 'CF-Connecting-IP': freshIp() });
  if (device) headers.set('Authorization', `Bearer ${device.token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test${path}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
    }),
    bindings,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

/** The JSON of a call that must succeed. */
export async function ok<T>(response: Response | Promise<Response>): Promise<T> {
  const settled = await response;
  if (settled.status !== 200)
    throw new Error(`expected 200, got ${settled.status}: ${await settled.text()}`);
  return settled.json<T>();
}

/** How many rows a `<table> WHERE ...` clause matches. */
export async function count(sql: string, ...values: unknown[]): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${sql}`)
    .bind(...values)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
