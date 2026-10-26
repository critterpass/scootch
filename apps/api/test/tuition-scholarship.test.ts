import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashDeviceToken } from '../src/device-auth';
import type { Bindings } from '../src/env';
import { tuitionCustomerId, writeTuitionRecord } from '../src/tuition/records';
import { revenueCatApiBase } from '../src/tuition/revenuecat-api';
import { isTuitionNow } from '../src/tuition/tuition-now';

import {
  createdCustomerAnswer,
  customerNotFound,
  entitlementsAnswer,
  grantAnswer,
  projectId,
  tuitionEntitlementId,
} from './revenuecat-fixtures';
import { as, ok, registerDevice, wireErrorOf } from './support';

const day = 24 * 60 * 60 * 1000;
/** A scholarship is a school year, and can be asked for again in the last month of it. */
const scholarshipDays = 365;
const scholarshipAskAgainDays = 30;

/** The bindings with RevenueCat's API set up, as on the workers. */
const apiEnv: Bindings = {
  ...env,
  REVENUECAT_API_V2_KEY: 'sk_test_v2_key',
  REVENUECAT_PROJECT_ID: projectId,
};

type Sent = { method: string; url: string; body: unknown };

/** RevenueCat at the network boundary: every request is kept and answered from the fixtures. */
function revenueCat(answer: (sent: Sent) => Response): Sent[] {
  const sent: Sent[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith(revenueCatApiBase)) {
      return Promise.reject(new Error(`unexpected request to ${url}`));
    }
    const one: Sent = {
      method: init?.method ?? 'GET',
      url: url.slice(revenueCatApiBase.length),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    sent.push(one);
    return Promise.resolve(answer(one));
  });
  return sent;
}

/** RevenueCat taking every grant, for a customer it already knows. */
function grantingRevenueCat(appUserId: string): Sent[] {
  return revenueCat(({ url, body }) =>
    url.endsWith('/entitlements?limit=100')
      ? Response.json(entitlementsAnswer)
      : grantAnswer(appUserId, (body as { expires_at: number }).expires_at),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function student() {
  const token = await registerDevice();
  const deviceHash = await hashDeviceToken(token);
  return { token, deviceHash, appUserId: await tuitionCustomerId(deviceHash) };
}

type Answer = { expiresAt: string; granted: boolean };

const ask = (token: string, bindings: Bindings = apiEnv) =>
  as({ token }, 'POST', '/v1/tuition/scholarship', {}, bindings);

const grants = (sent: readonly Sent[]) =>
  sent.filter((one) => one.url.endsWith('/actions/grant_entitlement'));

describe('the scholarship', () => {
  it('grants a free school year of tuition through RevenueCat, with no proof', async () => {
    const { token, deviceHash, appUserId } = await student();
    const before = Date.now();
    const sent = grantingRevenueCat(appUserId);

    const answer = await ok<Answer>(ask(token));

    expect(answer.granted).toBe(true);
    const until = Date.parse(answer.expiresAt);
    expect(until).toBeGreaterThanOrEqual(before + scholarshipDays * day);
    expect(until).toBeLessThanOrEqual(Date.now() + scholarshipDays * day);
    expect(grants(sent)).toEqual([
      {
        method: 'POST',
        url: `/projects/${projectId}/customers/${appUserId}/actions/grant_entitlement`,
        body: { entitlement_id: tuitionEntitlementId, expires_at: until },
      },
    ]);
    expect(await isTuitionNow(env, deviceHash, new Date(until - day))).toBe(true);
    expect(await isTuitionNow(env, deviceHash, new Date(until + day))).toBe(false);
  });

  it('answers a second ask with the year already given, and asks RevenueCat nothing', async () => {
    const { token, appUserId } = await student();
    const sent = grantingRevenueCat(appUserId);
    const first = await ok<Answer>(ask(token));
    const asked = sent.length;

    const again = await ok<Answer>(ask(token));

    expect(again).toEqual({ expiresAt: first.expiresAt, granted: false });
    expect(sent).toHaveLength(asked);
  });

  it('can be asked for again once the year is within a month of its end', async () => {
    const { token, appUserId } = await student();
    const now = new Date();
    const endsSoon = new Date(now.getTime() + (scholarshipAskAgainDays - 1) * day).toISOString();
    await writeTuitionRecord(
      env.DB,
      {
        appUserId,
        active: true,
        expiresAt: endsSoon,
        productId: null,
        storeEnvironment: null,
        source: 'api',
        lastEventId: null,
        eventAt: now.toISOString(),
      },
      now,
    ).run();
    const sent = grantingRevenueCat(appUserId);

    const answer = await ok<Answer>(ask(token));

    expect(answer.granted).toBe(true);
    expect(Date.parse(answer.expiresAt)).toBeGreaterThan(Date.parse(endsSoon));
    expect(grants(sent)).toHaveLength(1);
  });

  it('makes the customer at RevenueCat first when RevenueCat has never seen the phone', async () => {
    const { token, appUserId } = await student();
    let created = false;
    const sent = revenueCat(({ method, url, body }) => {
      if (url.endsWith('/entitlements?limit=100')) return Response.json(entitlementsAnswer);
      if (method === 'POST' && url === `/projects/${projectId}/customers`) {
        created = true;
        return createdCustomerAnswer(appUserId);
      }
      return created
        ? grantAnswer(appUserId, (body as { expires_at: number }).expires_at)
        : Response.json(customerNotFound, { status: 404 });
    });

    expect((await ok<Answer>(ask(token))).granted).toBe(true);
    expect(sent.filter((one) => one.method === 'POST').map((one) => one.url)).toEqual([
      `/projects/${projectId}/customers/${appUserId}/actions/grant_entitlement`,
      `/projects/${projectId}/customers`,
      `/projects/${projectId}/customers/${appUserId}/actions/grant_entitlement`,
    ]);
    expect(sent.find((one) => one.url === `/projects/${projectId}/customers`)?.body).toEqual({
      id: appUserId,
    });
  });

  it('fails plainly, and keeps nothing, when RevenueCat does not take the grant', async () => {
    const { token, deviceHash } = await student();
    revenueCat(({ url }) =>
      url.endsWith('/entitlements?limit=100')
        ? Response.json(entitlementsAnswer)
        : Response.json({ object: 'error', type: 'server_error' }, { status: 503 }),
    );

    const response = await ask(token);

    expect(response.status).toBe(500);
    expect((await wireErrorOf(response)).code).toBe('internal');
    expect(await isTuitionNow(env, deviceHash)).toBe(false);
  });

  it('fails plainly where RevenueCat is not set up, without calling it', async () => {
    const { token } = await student();
    const sent = revenueCat(() => Response.json({}));
    const { REVENUECAT_API_V2_KEY: _key, REVENUECAT_PROJECT_ID: _project, ...bare } = env;

    expect((await ask(token, bare)).status).toBe(500);
    expect(sent).toEqual([]);
  });

  it('is only for a registered device, and takes nothing in its body', async () => {
    revenueCat(() => Response.json({}));
    expect((await as(undefined, 'POST', '/v1/tuition/scholarship', {}, apiEnv)).status).toBe(401);
    const { token } = await student();
    const response = await as(
      { token },
      'POST',
      '/v1/tuition/scholarship',
      { note: 'Student budget' },
      apiEnv,
    );
    expect(response.status).toBe(400);
  });
});
