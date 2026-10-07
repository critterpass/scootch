import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  appleKeysUrl,
  createAppleKeySource,
  type AppleKeySource,
} from '../src/accounts/apple-keys';
import { verifyAppleToken } from '../src/accounts/apple-token';
import { hashDeviceToken } from '../src/device-auth';

import { registerDevice } from './support';
import { as, count, ok } from './table-support';

const base64Url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
const encode = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

type Signer = { kid: string; privateKey: CryptoKey; jwk: JsonWebKey };

async function newSigner(kid: string): Promise<Signer> {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk };
}

/** An identity token shaped like Apple's: RS256, with the claims Apple sends, email included. */
async function tokenFrom(signer: Signer, claims: Record<string, unknown>): Promise<string> {
  const unsigned = `${encode({ alg: 'RS256', kid: signer.kid })}.${encode(claims)}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signer.privateKey,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(signature)}`;
}

const now = Date.parse('2026-10-07T05:00:00.000Z');
const subject = '001999.8a1b2c3d4e5f4a6b8c7d9e0f1a2b3c4d.0931';
const goodClaims = (nonce: string, overrides: Record<string, unknown> = {}) => ({
  iss: 'https://appleid.apple.com',
  aud: 'app.scootch.dev',
  exp: Math.floor(now / 1000) + 600,
  iat: Math.floor(now / 1000),
  sub: subject,
  nonce,
  email: 'someone@privaterelay.appleid.com',
  email_verified: true,
  ...overrides,
});

let apple: Signer;
let stranger: Signer;
let fetched = 0;

/** Apple's key endpoint at the network boundary, in the shape Apple publishes. */
const appleFetch: typeof fetch = (input) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== appleKeysUrl) throw new Error(`unexpected request to ${url}`);
  fetched += 1;
  return Promise.resolve(
    Response.json({
      keys: [
        { kty: 'RSA', kid: apple.kid, use: 'sig', alg: 'RS256', n: apple.jwk.n, e: apple.jwk.e },
      ],
    }),
  );
};

beforeAll(async () => {
  apple = await newSigner('apple-key-1');
  stranger = await newSigner('apple-key-1');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the Apple identity token verifier', () => {
  let keys: AppleKeySource;
  const verify = (token: string, nonce = 'nonce-1') =>
    verifyAppleToken(token, { nonce, now, keys });
  beforeAll(() => {
    keys = createAppleKeySource(appleFetch);
  });

  it('accepts a good token for either bundle id and gives back only the subject', async () => {
    expect(await verify(await tokenFrom(apple, goodClaims('nonce-1')))).toEqual({
      ok: true,
      subject,
    });
    expect(
      await verify(await tokenFrom(apple, goodClaims('nonce-1', { aud: 'app.scootch' }))),
    ).toEqual({ ok: true, subject });
  });

  it.each([
    ['wrong_audience', { aud: 'com.someone.else' }],
    ['wrong_issuer', { iss: 'https://appleid.apple.com.evil.example' }],
    ['expired', { exp: Math.floor(now / 1000) - 120 }],
    ['wrong_nonce', { nonce: 'another-nonce' }],
  ])('refuses a token with %s', async (problem, overrides) => {
    const token = await tokenFrom(apple, goodClaims('nonce-1', overrides));

    expect(await verify(token)).toEqual({ ok: false, problem });
  });

  it('refuses a token with no nonce at all', async () => {
    const { nonce: _nonce, ...claims } = goodClaims('nonce-1');

    expect(await verify(await tokenFrom(apple, claims))).toEqual({
      ok: false,
      problem: 'wrong_nonce',
    });
  });

  it('refuses a bad signature: another key under Apple’s key id, or claims changed after signing', async () => {
    const forged = await tokenFrom(stranger, goodClaims('nonce-1'));
    expect(await verify(forged)).toEqual({ ok: false, problem: 'bad_signature' });

    const [header, , signature] = (await tokenFrom(apple, goodClaims('nonce-1'))).split('.');
    const edited = `${header}.${encode(goodClaims('nonce-1', { sub: 'someone-else' }))}.${signature}`;
    expect(await verify(edited)).toEqual({ ok: false, problem: 'bad_signature' });
  });

  it('refuses an unsigned token and a key id Apple does not publish', async () => {
    const none = `${encode({ alg: 'none', kid: apple.kid })}.${encode(goodClaims('nonce-1'))}.AA`;
    expect(await verify(none)).toEqual({ ok: false, problem: 'malformed' });

    const other = await tokenFrom({ ...apple, kid: 'not-published' }, goodClaims('nonce-1'));
    expect(await verify(other)).toEqual({ ok: false, problem: 'unknown_key' });
  });

  it('fetches Apple’s keys once and keeps them', async () => {
    const source = createAppleKeySource(appleFetch);
    fetched = 0;

    for (let index = 0; index < 3; index += 1) {
      await verifyAppleToken(await tokenFrom(apple, goodClaims('n')), {
        nonce: 'n',
        now,
        keys: source,
      });
    }

    expect(fetched).toBe(1);
  });
});

describe('POST /v1/accounts/apple', () => {
  async function nonceFor(token: string): Promise<string> {
    return (await ok<{ nonce: string }>(as({ token }, 'POST', '/v1/accounts/apple/nonce'))).nonce;
  }
  const liveClaims = (nonce: string, sub = subject) =>
    goodClaims(nonce, { sub, exp: Math.floor(Date.now() / 1000) + 600 });

  it('creates the account, links the device, and stores the subject only as a hash and no email', async () => {
    vi.stubGlobal('fetch', appleFetch);
    const token = await registerDevice();
    const nonce = await nonceFor(token);
    const identityToken = await tokenFrom(apple, liveClaims(nonce));

    const response = await as({ token }, 'POST', '/v1/accounts/apple', { identityToken, nonce });

    const body = await ok<Record<string, unknown>>(response);
    expect(Object.keys(body).sort()).toEqual(
      ['accountId', 'canBeHaunted', 'created', 'displayName', 'warned', 'whoCanSit'].sort(),
    );
    expect(body).toMatchObject({ created: true, displayName: null });
    expect(
      await count(
        'account_devices WHERE device_hash = ? AND account_id = ?',
        await hashDeviceToken(token),
        body['accountId'],
      ),
    ).toBe(1);
    const rows = JSON.stringify((await env.DB.prepare('SELECT * FROM accounts').all()).results);
    expect(rows).not.toContain(subject);
    expect(rows).not.toContain('privaterelay');
  });

  it('refuses the same token a second time: its nonce is spent', async () => {
    vi.stubGlobal('fetch', appleFetch);
    const token = await registerDevice();
    const nonce = await nonceFor(token);
    const identityToken = await tokenFrom(apple, liveClaims(nonce, 'replay-subject'));
    await ok(as({ token }, 'POST', '/v1/accounts/apple', { identityToken, nonce }));

    const replay = await as({ token }, 'POST', '/v1/accounts/apple', { identityToken, nonce });
    expect(replay.status).toBe(401);

    // Nor does it work from another device that somehow got hold of both.
    const thief = await registerDevice();
    const stolen = await as({ token: thief }, 'POST', '/v1/accounts/apple', {
      identityToken,
      nonce,
    });
    expect(stolen.status).toBe(401);
    expect(await count('account_devices WHERE device_hash = ?', await hashDeviceToken(thief))).toBe(
      0,
    );
  });

  it('refuses a token signed for a nonce this server never gave', async () => {
    vi.stubGlobal('fetch', appleFetch);
    const token = await registerDevice();
    const nonce = 'a'.repeat(32);
    const identityToken = await tokenFrom(apple, liveClaims(nonce, 'made-up-nonce'));

    const response = await as({ token }, 'POST', '/v1/accounts/apple', { identityToken, nonce });

    expect(response.status).toBe(401);
  });

  it('finds the same account from a second device, and a device holds one account at a time', async () => {
    vi.stubGlobal('fetch', appleFetch);
    const first = await registerDevice();
    const second = await registerDevice();
    const signIn = async (token: string, sub: string) => {
      const nonce = await nonceFor(token);
      const identityToken = await tokenFrom(apple, liveClaims(nonce, sub));
      return ok<{ accountId: string; created: boolean }>(
        as({ token }, 'POST', '/v1/accounts/apple', { identityToken, nonce }),
      );
    };

    const one = await signIn(first, 'shared-subject');
    const two = await signIn(second, 'shared-subject');
    expect(two).toMatchObject({ accountId: one.accountId, created: false });
    expect(await count('account_devices WHERE account_id = ?', one.accountId)).toBe(2);

    const moved = await signIn(second, 'another-subject');
    expect(moved.accountId).not.toBe(one.accountId);
    expect(
      await count('account_devices WHERE device_hash = ?', await hashDeviceToken(second)),
    ).toBe(1);
  });

  it('leaves a device with no account able to use everything else', async () => {
    const token = await registerDevice();

    expect((await as({ token }, 'POST', '/v1/data-delete', {})).status).toBe(200);
  });
});
