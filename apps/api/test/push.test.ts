import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { wireErrorSchema } from '../src/contracts';
import type { Bindings } from '../src/env';
import { apnsRequest, signProviderToken, type ApnsKey } from '../src/push/apns';
import { hauntPush } from '../src/push/push-lines';
import { pushToAccount } from '../src/push/push';

import { pushNudge } from '../src/tables/nudge-push';
import { tableStub } from '../src/tables/tables';

import {
  as,
  befriend,
  count,
  inviteCode,
  ok,
  openTable,
  person,
  postHaunt,
  signingEnv,
  type Person,
} from './table-support';

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
const register = (who: Pick<Person, 'token'>, body: Record<string, unknown>) =>
  as(who, 'POST', '/v1/push/tokens', {
    kind: 'alert',
    environment: 'sandbox',
    bundleId: 'app.scootch.dev',
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
    const message = {
      ...hauntPush('Kofi', 'abcdefgh234567ab'),
      alert: hauntPush('Kofi', 'x').alert.en,
    };
    const target = {
      token: token('a'),
      environment: 'sandbox',
      bundleId: 'app.scootch.dev',
    } as const;
    const request = await apnsRequest(key, target, message, now);

    expect(request.method).toBe('POST');
    expect(request.url).toBe(`https://api.sandbox.push.apple.com/3/device/${token('a')}`);
    expect(request.headers.get('authorization')).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(request.headers.get('apns-topic')).toBe('app.scootch.dev');
    expect(request.headers.get('apns-push-type')).toBe('alert');
    expect(request.headers.get('apns-collapse-id')).toBe('haunt-abcdefgh234567ab');
    expect(request.headers.get('apns-expiration')).toBe(String(now.getTime() / 1000 + 86_400));
    expect(await request.json()).toEqual({
      aps: { alert: { title: 'Scootch', body: 'Kofi sent you a monster.' }, sound: 'default' },
      scootch: { kind: 'haunt', hauntId: 'abcdefgh234567ab' },
    });

    const live = await apnsRequest(key, { ...target, environment: 'production' }, message, now);
    expect(new URL(live.url).host).toBe('api.push.apple.com');
  });
});

describe('registering a push token', () => {
  it('keeps the token with the device and its environment, and the newest device token replaces the last', async () => {
    const who = await person('Mai');

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
      { token: token('b'), kind: 'alert', environment: 'sandbox', bundle_id: 'app.scootch.dev' },
      {
        token: token('c'),
        kind: 'live_activity',
        environment: 'sandbox',
        bundle_id: 'app.scootch.dev',
      },
      {
        token: token('d'),
        kind: 'live_activity',
        environment: 'sandbox',
        bundle_id: 'app.scootch.dev',
      },
    ]);

    await ok(as(who, 'DELETE', `/v1/push/tokens/${token('c')}`));
    expect(await count('push_tokens WHERE device_hash = ?', who.deviceHash)).toBe(2);
  });

  it('needs a registered device and a token in Apple’s shape, and refuses in the wire error shape', async () => {
    const who = await person('Mai');

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
    const who = await person('Mai');
    await ok(register(who, { token: token('a') }));
    const { send, sent } = apple();
    const push = hauntPush('Kofi', 'abcdefgh234567ab');

    expect(await pushToAccount(withKey(), who.accountId, push, new Date(), send)).toBe(false);
    await pushOn();
    expect(await pushToAccount(env, who.accountId, push, new Date(), send)).toBe(false);
    expect(
      await pushToAccount({ ...withKey(), APNS_KEY_ID: '' }, who.accountId, push, new Date(), send),
    ).toBe(false);
    expect(sent).toEqual([]);
  });

  it('reaches every phone of the account in its own language, and forgets a token Apple says is gone', async () => {
    const who = await person('Mai');
    await ok(register(who, { token: token('a') }));
    await env.DB.prepare("UPDATE devices SET language = 'vi' WHERE token_hash = ?")
      .bind(who.deviceHash)
      .run();
    await pushOn();
    const push = hauntPush(null, 'abcdefgh234567ab');

    const first = apple();
    expect(await pushToAccount(withKey(), who.accountId, push, new Date(), first.send)).toBe(true);
    expect(first.sent).toHaveLength(1);
    expect(await first.sent[0]?.json()).toMatchObject({
      aps: { alert: { body: 'Có người gửi cho bạn một con quái.' } },
    });

    const gone = apple(() => Response.json({ reason: 'Unregistered' }, { status: 410 }));
    expect(await pushToAccount(withKey(), who.accountId, push, new Date(), gone.send)).toBe(false);
    expect(await count('push_tokens WHERE device_hash = ?', who.deviceHash)).toBe(0);
  });

  it('goes out once for a haunt received, naming the sender unless it was sent without a name; with no key the haunt is sent all the same', async () => {
    const [sender, recipient, other] = [
      await person('Mai'),
      await person('Bo'),
      await person('Cy'),
    ];
    await befriend(sender, recipient);
    await befriend(other, recipient);
    await ok(register(recipient, { token: token('a') }));
    await pushOn();
    const { send, sent } = apple();
    vi.stubGlobal('fetch', send);
    const haunt = (extra: Record<string, unknown> = {}) => ({
      to: recipient.accountId,
      bodyType: 'sock',
      seed: '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50',
      dare: 'two_minutes',
      screen: 'pass',
      ...extra,
    });
    const keyed = { ...withKey(), SHARE_SIGNING_SECRET: signingEnv.SHARE_SIGNING_SECRET ?? '' };

    const { pageId } = await ok<{ pageId: string }>(postHaunt(sender, haunt(), keyed));
    expect(sent).toHaveLength(1);
    expect(await sent[0]?.json()).toEqual({
      aps: { alert: { title: 'Scootch', body: 'Mai sent you a monster.' }, sound: 'default' },
      scootch: { kind: 'haunt', hauntId: pageId },
    });

    await ok(postHaunt(other, haunt({ anonymous: true })));
    expect(sent).toHaveLength(1);
    expect(await count('haunts WHERE recipient = ?', recipient.accountId)).toBe(2);
  });
});

describe('a nudge to someone whose phone has no connection', () => {
  it('goes as a push naming who nudged, and none is sent for a nudge the table would refuse', async () => {
    const [host, guest] = [await person('Mai'), await person('Bo')];
    const { tableId } = await openTable(host);
    await ok(
      as(guest, 'POST', '/v1/tables/join', {
        code: await inviteCode(host, tableId),
        purchase: 'free',
      }),
    );
    await ok(register(guest, { token: token('e') }));
    await pushOn();
    const { send, sent } = apple();
    vi.stubGlobal('fetch', send);
    const table = await tableStub(env, tableId).stored();

    expect(await pushNudge(withKey(), table, host.accountId, guest.accountId)).toBe('pushed');
    expect(await sent[0]?.json()).toEqual({
      aps: { alert: { title: 'Scootch', body: 'Mai nudged you.' }, sound: 'default' },
      scootch: { kind: 'nudge', tableId },
    });

    const spent = structuredClone(table);
    if (spent?.seats[0]) spent.seats[0].nudges = { [guest.accountId]: 3 };
    expect(await pushNudge(withKey(), spent, host.accountId, guest.accountId)).toBe('none');
    expect(await pushNudge(withKey(), table, host.accountId, 'aaaaaaaaaaaa')).toBe('none');
    expect(await pushNudge(env, table, host.accountId, guest.accountId)).toBe('none');
    expect(sent).toHaveLength(1);
  });
});
