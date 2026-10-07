import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { expect } from 'vitest';

import { newAccountId } from '../src/accounts/ids';
import { pairOf } from '../src/accounts/friends';
import { createApp } from '../src/app';
import { hashDeviceToken } from '../src/device-auth';
import type { Bindings } from '../src/env';
import * as routes from '../src/routes/index.generated';
import { tableServerMessageSchema, type TableServerMessage } from '../src/tables/table-contract';

import { signWords } from '../src/sharing/signed-words';

import { freshIp, registerDevice, shareSecret } from './support';

export type Person = { token: string; deviceHash: string; accountId: string; name: string };

/** One request through the shipped routes, as a device, with the bindings a test chooses. */
export async function as(
  person: Pick<Person, 'token'> | undefined,
  method: string,
  path: string,
  body?: unknown,
  bindings: Bindings = env,
): Promise<Response> {
  const headers = new Headers({ 'CF-Connecting-IP': freshIp() });
  if (person) headers.set('Authorization', `Bearer ${person.token}`);
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

/** The fixed word a refused call gives as its reason. */
export async function reasonOf(response: Response | Promise<Response>): Promise<unknown> {
  const settled = await response;
  expect(settled.status).toBe(400);
  const body = await settled.json<{ error: { detail?: { reason?: string } } }>();
  return body.error.detail?.reason;
}

/**
 * A registered device with an account, as Sign in with Apple leaves it. The rows are written
 * directly; the sign-in itself has its own tests.
 */
export async function person(name: string): Promise<Person> {
  const token = await registerDevice();
  const deviceHash = await hashDeviceToken(token);
  const accountId = newAccountId();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO accounts (id, apple_subject_hash, display_name, created_at) VALUES (?, ?, ?, ?)',
    ).bind(accountId, await hashDeviceToken(`subject-${accountId}`), name, now),
    env.DB.prepare(
      'INSERT INTO account_devices (device_hash, account_id, linked_at) VALUES (?, ?, ?)',
    ).bind(deviceHash, accountId, now),
  ]);
  return { token, deviceHash, accountId, name };
}

export async function befriend(one: Person, other: Person): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO friendships (account_a, account_b, created_at) VALUES (?, ?, ?)',
  )
    .bind(...pairOf(one.accountId, other.accountId), new Date().toISOString())
    .run();
}

/** The bindings with the secret the server signs its own words with. */
export const signingEnv: Bindings = { ...env, SHARE_SIGNING_SECRET: shareSecret };

/** A monster's words as the task call would have written and signed them for this seed. */
export async function signedWords(seed: string, language: 'en' | 'vi' = 'en') {
  const words = { name: 'Sockrates', title: 'Drawer dweller', flavourText: 'Lives in pairs.' };
  return {
    ...words,
    language,
    signature: await signWords(shareSecret, { ...words, seed, language }),
  };
}

/**
 * Sends a haunt as the app does: with the words the server signed for the monster's seed, unless
 * the body brings its own `words` (or `words: null` for none at all).
 */
export async function postHaunt(
  from: Pick<Person, 'token'>,
  body: Record<string, unknown>,
  bindings: Bindings = signingEnv,
): Promise<Response> {
  const { words, ...rest } = body;
  const carried =
    words === undefined && typeof body['seed'] === 'string'
      ? await signedWords(body['seed'])
      : words;
  return as(
    from,
    'POST',
    '/v1/haunts',
    carried === null || carried === undefined ? rest : { ...rest, words: carried },
    bindings,
  );
}

export async function count(sql: string, ...values: unknown[]): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${sql}`)
    .bind(...values)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

type State = Extract<TableServerMessage, { type: 'state' }>;

/** A real WebSocket client at a table. Every message it gets must match the contract. */
export class Seat {
  readonly messages: TableServerMessage[] = [];
  closed: { code: number; reason: string } | undefined;

  constructor(
    readonly ws: WebSocket,
    readonly who: Person,
  ) {
    ws.accept();
    ws.addEventListener('message', (event) => {
      this.messages.push(tableServerMessageSchema.parse(JSON.parse(String(event.data))));
    });
    ws.addEventListener('close', (event) => {
      this.closed = { code: event.code, reason: event.reason };
    });
  }

  send(message: unknown): void {
    this.ws.send(typeof message === 'string' ? message : JSON.stringify(message));
  }

  /** The newest snapshot this client holds. */
  get state(): State {
    const state = this.messages.findLast((message) => message.type === 'state');
    if (!state) throw new Error('no state yet');
    return state;
  }

  of<T extends TableServerMessage['type']>(type: T): Extract<TableServerMessage, { type: T }>[] {
    return this.messages.filter(
      (m): m is Extract<TableServerMessage, { type: T }> => m.type === type,
    );
  }

  seatOf(other: Person) {
    return this.state.seats.find((seat) => seat.userId === other.accountId);
  }
}

/** Waits for something the sockets will make true, checking between turns of the event loop. */
export async function until(check: () => boolean, what = 'condition'): Promise<void> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** Lets messages already on their way arrive, before asserting that something did not. */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

/** The raw answer to a WebSocket upgrade on the shipped route, as the person's device. */
export async function upgrade(who: Person, tableId: string, query = ''): Promise<Response> {
  const headers = new Headers({
    'CF-Connecting-IP': freshIp(),
    Authorization: `Bearer ${who.token}`,
    Upgrade: 'websocket',
  });
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test/v1/tables/${tableId}/ws${query}`, { headers }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

/** Opens the table's WebSocket and waits for its first message. */
export async function connect(who: Person, tableId: string, query = ''): Promise<Seat> {
  const response = await upgrade(who, tableId, query);
  if (response.status !== 101 || !response.webSocket) {
    throw new Error(`no socket: ${response.status} ${await response.text()}`);
  }
  const seat = new Seat(response.webSocket, who);
  await until(() => seat.messages.length > 0 || seat.closed !== undefined, 'the first message');
  return seat;
}

/** A Plus host opens a table and connects. */
export async function openTable(
  host: Person,
  query = '',
): Promise<{ tableId: string; seat: Seat }> {
  const { tableId } = await ok<{ tableId: string }>(
    as(host, 'POST', '/v1/tables', { purchase: 'yearly' }),
  );
  return { tableId, seat: await connect(host, tableId, query) };
}

export async function inviteCode(from: Person, tableId: string): Promise<string> {
  return (await ok<{ code: string }>(as(from, 'POST', `/v1/tables/${tableId}/invites`))).code;
}

/** Joins with a link code as a free guest, then connects. */
export async function sitDown(
  who: Person,
  code: string,
  tableId: string,
  query = '',
): Promise<Seat> {
  await ok(as(who, 'POST', '/v1/tables/join', { code, purchase: 'free' }));
  return connect(who, tableId, query);
}
