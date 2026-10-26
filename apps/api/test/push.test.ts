import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { wireErrorSchema } from '../src/contracts';
import { hashDeviceToken } from '../src/device-auth';
import type { Bindings } from '../src/env';
import { apnsRequest, signProviderToken, type ApnsKey } from '../src/push/apns';
import { pushToDevice, type PushToSend } from '../src/push/push';

import { as, count, ok, registerDevice } from './support';

type Device = { token: string; deviceHash: string };

async function device(): Promise<Device> {
  const token = await registerDevice();
  return { token, deviceHash: await hashDeviceToken(token) };
}

/** A push as a server-side caller would build one: fixed lines and ids only. */
const reminder: PushToSend = {
  alert: {
    en: { title: "Phu's Class", body: 'Class starts in five minutes.' },
    vi: { title: "Phu's Class", body: 'Năm phút nữa vào lớp.' },
  },
  data: { kind: 'class', taskId: 'abcdefgh234567ab' },
  collapseId: 'class-abcdefgh234567ab',
  expiresInSeconds: 24 * 60 * 60,
};

const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));

/** A key made for the tests, in the PEM form of Apple's `.p8` file. Never Apple's. */
let key: ApnsKey;
let publicKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const base64 = btoa(String.fromCharCode(...der));
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? '';
  key = {
    p8: `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`,
    keyId: 'ABC123DEFG',
    teamId: 'YFND2EEW8S',
  };
  publicKey = pair.publicKey;
});

// Nothing in this file may reach the network: a request nobody stands in for fails.
beforeEach(() => {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    throw new Error(
      `unexpected request to ${input instanceof Request ? input.url : String(input)}`,
    );
  });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await env.DB.prepare('DELETE FROM flags').run();
});

const token = (fill: string) => fill.repeat(64);
const register = (who: Pick<Device, 'token'>, body: Record<string, unknown>) =>
  as(who, 'POST', '/v1/push/tokens', {
    kind: 'alert',
    environment: 'sandbox',
    bundleId: 'com.phusclass.dev',
    ...body,
  });
const pushOn = () =>
  env.DB.prepare(`INSERT INTO flags (name, "on") VALUES ('push.remote', 1)`).run();
const withKey = (): Bindings => ({
  ...env,
  APNS_KEY_P8: key.p8,
  APNS_KEY_ID: key.keyId,
  APNS_TEAM_ID: key.teamId,
});

/** Stands in for Apple at the network boundary, keeping what it was sent. */
function apple(answer: () => Response = () => new Response(null, { status: 200 })) {
  const sent: Request[] = [];
  const send: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    if (!/^https:\/\/api(\.sandbox)?\.push\.apple\.com\//.test(request.url)) {
      return Promise.reject(new Error(`unexpected request to ${request.url}`));
    }
    sent.push(request);
    return Promise.resolve(answer());
  };
  return { send, sent };
}

describe('the provider token', () => {
  it('is an ES256 JWT that names the key and the team, and verifies against the key’s public half', async () => {
    const now = new Date('2026-10-07T08:00:00.000Z');
    const jwt = await signProviderToken(key, now);
    const [header = '', claims = '', signature = ''] = jwt.split('.');

    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(header)))).toEqual({
      alg: 'ES256',
      kid: 'ABC123DEFG',
    });
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(claims)))).toEqual({
      iss: 'YFND2EEW8S',
      iat: now.getTime() / 1000,
    });
    expect(fromBase64Url(signature)).toHaveLength(64);
    expect(
      await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        fromBase64Url(signature),
        new TextEncoder().encode(`${header}.${claims}`),
      ),
    ).toBe(true);
    // A key pasted as one line, its breaks written as backslash-n, signs the same way.
    const oneLine = { ...key, p8: key.p8.replaceAll('\n', '\\n') };
    expect((await signProviderToken(oneLine, now)).split('.')).toHaveLength(3);
  });
});

describe('a push request', () => {
  it('goes to the token’s own APNs host with the topic, the type and ids only beside the alert', async () => {
    const now = new Date('2026-10-07T08:00:00.000Z');
    const message = { ...reminder, alert: reminder.alert.en };
    const target = {
      token: token('a'),
      environment: 'sandbox',
      bundleId: 'com.phusclass.dev',
    } as const;
    const request = await apnsRequest(key, target, message, now);

    expect(request.method).toBe('POST');
    expect(request.url).toBe(`https://api.sandbox.push.apple.com/3/device/${token('a')}`);
    expect(request.headers.get('authorization')).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(request.headers.get('apns-topic')).toBe('com.phusclass.dev');
    expect(request.headers.get('apns-push-type')).toBe('alert');
    expect(request.headers.get('apns-collapse-id')).toBe('class-abcdefgh234567ab');
    expect(request.headers.get('apns-expiration')).toBe(String(now.getTime() / 1000 + 86_400));
    expect(await request.json()).toEqual({
      aps: {
        alert: { title: "Phu's Class", body: 'Class starts in five minutes.' },
        sound: 'default',
      },
      phusclass: { kind: 'class', taskId: 'abcdefgh234567ab' },
    });

    const live = await apnsRequest(key, { ...target, environment: 'production' }, message, now);
    expect(new URL(live.url).host).toBe('api.push.apple.com');
  });
});

describe('registering a push token', () => {
  it('keeps the token with the device and its environment, and the newest device token replaces the last', async () => {
    const who = await device();

    expect(await ok(register(who, { token: token('a') }))).toEqual({ registered: true });
    await ok(register(who, { token: token('b') }));
    await ok(register(who, { token: token('c'), kind: 'live_activity' }));
    await ok(register(who, { token: token('d'), kind: 'live_activity' }));

    const { results } = await env.DB.prepare(
      'SELECT token, kind, environment, bundle_id FROM push_tokens WHERE device_hash = ? ORDER BY token',
    )
      .bind(who.deviceHash)
      .all();
    expect(results).toEqual([
      { token: token('b'), kind: 'alert', environment: 'sandbox', bundle_id: 'com.phusclass.dev' },
      {
        token: token('c'),
        kind: 'live_activity',
        environment: 'sandbox',
        bundle_id: 'com.phusclass.dev',
      },
      {
        token: token('d'),
        kind: 'live_activity',
        environment: 'sandbox',
        bundle_id: 'com.phusclass.dev',
      },
    ]);

    await ok(as(who, 'DELETE', `/v1/push/tokens/${token('c')}`));
    expect(await count('push_tokens WHERE device_hash = ?', who.deviceHash)).toBe(2);
  });

  it('needs a registered device and a token in Apple’s shape, and refuses in the wire error shape', async () => {
    const who = await device();

    expect((await register({ token: 'x'.repeat(40) }, { token: token('a') })).status).toBe(401);
    for (const body of [
      { token: 'not a token' },
      { token: token('a'), kind: 'email' },
      { token: token('a'), environment: 'staging' },
      { token: token('a'), bundleId: 'com.someone.else' },
      { token: token('a'), note: 'call the clinic' },
    ]) {
      const refused = await register(who, body);
      expect(refused.status).toBe(400);
      expect(wireErrorSchema.parse(await refused.json()).error.code).toBe('bad_request');
    }
    expect(await count('push_tokens WHERE device_hash = ?', who.deviceHash)).toBe(0);
  });
});

describe('sending a push', () => {
  it('does nothing, and asks Apple nothing, with the flag off or the key’s secrets absent', async () => {
    const who = await device();
    await ok(register(who, { token: token('a') }));
    const { send, sent } = apple();

    expect(await pushToDevice(withKey(), who.deviceHash, reminder, new Date(), send)).toBe(false);
    await pushOn();
    expect(await pushToDevice(env, who.deviceHash, reminder, new Date(), send)).toBe(false);
    expect(
      await pushToDevice(
        { ...withKey(), APNS_KEY_ID: '' },
        who.deviceHash,
        reminder,
        new Date(),
        send,
      ),
    ).toBe(false);
    expect(sent).toEqual([]);
  });

  it('reaches the phone in its own language, and forgets a token Apple says is gone', async () => {
    const who = await device();
    await ok(register(who, { token: token('a') }));
    await env.DB.prepare("UPDATE devices SET language = 'vi' WHERE token_hash = ?")
      .bind(who.deviceHash)
      .run();
    await pushOn();

    const first = apple();
    expect(await pushToDevice(withKey(), who.deviceHash, reminder, new Date(), first.send)).toBe(
      true,
    );
    expect(first.sent).toHaveLength(1);
    expect(await first.sent[0]?.json()).toMatchObject({
      aps: { alert: { body: 'Năm phút nữa vào lớp.' } },
    });

    const gone = apple(() => Response.json({ reason: 'Unregistered' }, { status: 410 }));
    expect(await pushToDevice(withKey(), who.deviceHash, reminder, new Date(), gone.send)).toBe(
      false,
    );
    expect(await count('push_tokens WHERE device_hash = ?', who.deviceHash)).toBe(0);
  });
});
