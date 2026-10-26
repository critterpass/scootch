import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { hashDeviceToken } from '../src/device-auth';
import type { Bindings } from '../src/env';
import { apiNoTuitionBelievedMs, isTuitionNow } from '../src/tuition/tuition-now';
import { revenueCatApiBase } from '../src/tuition/revenuecat-api';
import * as routes from '../src/routes/index.generated';

import {
  customerAnswer,
  customerNotFound,
  delivery,
  entitlementsAnswer,
  tuitionEntitlementId,
  projectId,
  transferDelivery,
} from './revenuecat-fixtures';
import { as, freshIp, ok, registerDevice } from './support';

const day = 24 * 60 * 60 * 1000;
const webhookAuth = 'Bearer test-revenuecat-webhook-auth';

/** The bindings with the RevenueCat secrets left out. */
function withoutRevenueCat(): Bindings {
  const {
    REVENUECAT_API_V2_KEY: _key,
    REVENUECAT_PROJECT_ID: _project,
    REVENUECAT_WEBHOOK_AUTH: _auth,
    ...rest
  } = env;
  return rest;
}
/** The bindings with the webhook's secret set and RevenueCat's API not set up. */
const webhookEnv: Bindings = { ...withoutRevenueCat(), REVENUECAT_WEBHOOK_AUTH: webhookAuth };
/** The same, with RevenueCat's API set up. */
const apiEnv: Bindings = {
  ...webhookEnv,
  REVENUECAT_API_V2_KEY: 'sk_test_v2_key',
  REVENUECAT_PROJECT_ID: projectId,
};

afterEach(() => {
  vi.restoreAllMocks();
});

async function deliver(
  body: unknown,
  authorization: string | null = webhookAuth,
  bindings: Bindings = webhookEnv,
): Promise<Response> {
  const headers = new Headers({
    'CF-Connecting-IP': freshIp(),
    'Content-Type': 'application/json',
  });
  if (authorization !== null) headers.set('Authorization', authorization);
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/revenuecat/webhook', {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    bindings,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

async function outcomeOf(response: Promise<Response>): Promise<string> {
  return (await ok<{ outcome: string }>(response)).outcome;
}

/** A registered device and the id the server tells it to use at RevenueCat. */
async function device(): Promise<{ deviceHash: string; appUserId: string }> {
  const token = await registerDevice();
  const { appUserId } = await ok<{ appUserId: string }>(
    as({ token }, 'GET', '/v1/tuition/customer'),
  );
  return { deviceHash: await hashDeviceToken(token), appUserId };
}

const tuitionAt = (deviceHash: string, at: number, bindings: Bindings = webhookEnv) =>
  isTuitionNow(bindings, deviceHash, new Date(at));

async function storedRows(appUserId: string): Promise<number> {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM tuition_entitlements WHERE app_user_id = ?',
  )
    .bind(appUserId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe('the RevenueCat webhook', () => {
  it('refuses a delivery without the configured Authorization header, and keeps nothing', async () => {
    const { deviceHash, appUserId } = await device();
    const purchase = delivery(appUserId, { id: 'evt-auth', type: 'INITIAL_PURCHASE' });

    expect((await deliver(purchase, null)).status).toBe(401);
    expect((await deliver(purchase, 'Bearer not-the-secret')).status).toBe(401);
    expect((await deliver(purchase, webhookAuth.slice(0, -1))).status).toBe(401);
    // With no secret set for the environment, nothing gets in.
    expect((await deliver(purchase, webhookAuth, withoutRevenueCat())).status).toBe(401);

    expect(await storedRows(appUserId)).toBe(0);
    expect(await tuitionAt(deviceHash, Date.now())).toBe(false);
    // The same delivery, rightly signed, is then taken in: the refusals left no trace of its id.
    expect(await outcomeOf(deliver(purchase))).toBe('taken');
  });

  it('answers a body that is not an event with a bad request', async () => {
    expect((await deliver('not json')).status).toBe(400);
    expect((await deliver({ event: { id: 'evt-shapeless' } })).status).toBe(400);
  });

  it('gives an id the server handed out the same id every time, never the device hash', async () => {
    const token = await registerDevice();
    const first = await ok<{ appUserId: string }>(as({ token }, 'GET', '/v1/tuition/customer'));
    const again = await ok<{ appUserId: string }>(as({ token }, 'GET', '/v1/tuition/customer'));

    expect(first.appUserId).toMatch(/^[0-9a-f]{64}$/);
    expect(again).toEqual(first);
    expect(first.appUserId).not.toBe(await hashDeviceToken(token));
  });

  it('follows a subscription through purchase, renewal, change, cancellation and expiry', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    const send = (id: string, type: string, at: number, fields: Record<string, unknown> = {}) =>
      outcomeOf(deliver(delivery(appUserId, { id, type, ...fields }, at)));

    // A trial: tuition for its seven days, and not after.
    expect(await send('evt-1', 'INITIAL_PURCHASE', t0)).toBe('taken');
    expect(await tuitionAt(deviceHash, t0 + day)).toBe(true);
    expect(await tuitionAt(deviceHash, t0 + 8 * day)).toBe(false);

    // The trial converts: tuition to the end of the year.
    await send('evt-2', 'RENEWAL', t0 + 7 * day, {
      period_type: 'NORMAL',
      is_trial_conversion: true,
      expiration_at_ms: t0 + 372 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 200 * day)).toBe(true);

    // A change of plan keeps tuition.
    await send('evt-3', 'PRODUCT_CHANGE', t0 + 8 * day, {
      period_type: 'NORMAL',
      new_product_id: 'phusclass.dev.tuition.monthly',
      expiration_at_ms: t0 + 372 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 200 * day)).toBe(true);

    // Turning renewal off leaves tuition until the paid time runs out.
    await send('evt-4', 'CANCELLATION', t0 + 9 * day, {
      period_type: 'NORMAL',
      cancel_reason: 'UNSUBSCRIBE',
      expiration_at_ms: t0 + 372 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 371 * day)).toBe(true);
    expect(await tuitionAt(deviceHash, t0 + 373 * day)).toBe(false);

    // Turning it back on.
    await send('evt-5', 'UNCANCELLATION', t0 + 10 * day, {
      period_type: 'NORMAL',
      expiration_at_ms: t0 + 372 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 371 * day)).toBe(true);

    // The store extends it.
    await send('evt-6', 'SUBSCRIPTION_EXTENDED', t0 + 11 * day, {
      period_type: 'NORMAL',
      expiration_at_ms: t0 + 400 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 390 * day)).toBe(true);

    // The renewal charge fails: tuition holds through the grace period.
    await send('evt-7', 'BILLING_ISSUE', t0 + 400 * day, {
      period_type: 'NORMAL',
      expiration_at_ms: t0 + 400 * day,
      grace_period_expiration_at_ms: t0 + 416 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 410 * day)).toBe(true);
    // The cancellation the failed charge brings does not cut the grace period short.
    await send('evt-8', 'CANCELLATION', t0 + 400 * day + 1000, {
      period_type: 'NORMAL',
      cancel_reason: 'BILLING_ERROR',
      expiration_at_ms: t0 + 400 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 410 * day)).toBe(true);

    // The charge never succeeds: tuition ends.
    await send('evt-9', 'EXPIRATION', t0 + 416 * day, {
      period_type: 'NORMAL',
      expiration_reason: 'BILLING_ERROR',
      expiration_at_ms: t0 + 416 * day,
    });
    expect(await tuitionAt(deviceHash, t0 + 416 * day)).toBe(false);
    expect(await tuitionAt(deviceHash, t0)).toBe(false);
  });

  it('keeps the store environment, the product and the last event on the record', async () => {
    const { appUserId } = await device();
    await deliver(delivery(appUserId, { id: 'evt-kept', type: 'INITIAL_PURCHASE' }));

    const row = await env.DB.prepare(
      `SELECT active, product_id, store_environment, source, last_event_id
       FROM tuition_entitlements WHERE app_user_id = ?`,
    )
      .bind(appUserId)
      .first();
    expect(row).toEqual({
      active: 1,
      product_id: 'phusclass.dev.tuition.yearly',
      store_environment: 'sandbox',
      source: 'webhook',
      last_event_id: 'evt-kept',
    });
  });

  it('takes tuition away at once on a refund', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    await deliver(
      delivery(
        appUserId,
        {
          id: 'evt-r1',
          type: 'INITIAL_PURCHASE',
          period_type: 'NORMAL',
          expiration_at_ms: t0 + 30 * day,
        },
        t0,
      ),
    );
    await deliver(
      delivery(
        appUserId,
        {
          id: 'evt-r2',
          type: 'CANCELLATION',
          cancel_reason: 'CUSTOMER_SUPPORT',
          price: -5.99,
          expiration_at_ms: t0 + 30 * day,
        },
        t0 + day,
      ),
    );
    expect(await tuitionAt(deviceHash, t0 + 2 * day)).toBe(false);
  });

  it('changes nothing for a purchase that does not grant tuition', async () => {
    const { deviceHash, appUserId } = await device();
    const ink = {
      id: 'evt-ink',
      type: 'NON_RENEWING_PURCHASE',
      product_id: 'ink_moss',
      entitlement_id: null,
      entitlement_ids: null,
      expiration_at_ms: null,
      period_type: 'NORMAL',
    };
    expect(await outcomeOf(deliver(delivery(appUserId, ink)))).toBe('taken');
    expect(await storedRows(appUserId)).toBe(0);
    expect(await tuitionAt(deviceHash, Date.now())).toBe(false);
  });

  it('takes in the dashboard’s test event and keeps nothing for it', async () => {
    const { appUserId } = await device();
    const test = delivery(appUserId, { id: 'evt-test', type: 'TEST' });
    expect(await outcomeOf(deliver(test))).toBe('taken');
    expect(await storedRows(appUserId)).toBe(0);
  });

  it('finds the device under an alias when the event names another id first', async () => {
    const { deviceHash, appUserId } = await device();
    const anonymous = '$RCAnonymousID:8b3c2f0e6a5d4c1b9e7f0a2d4c6b8e1f';
    await deliver(
      delivery(anonymous, {
        id: 'evt-alias',
        type: 'INITIAL_PURCHASE',
        aliases: [anonymous, appUserId],
        original_app_user_id: anonymous,
      }),
    );
    expect(await tuitionAt(deviceHash, Date.now() + day)).toBe(true);
  });

  it('moves tuition to the device a purchase is restored on', async () => {
    const before = await device();
    const after = await device();
    const t0 = Date.now();
    await deliver(delivery(before.appUserId, { id: 'evt-t1', type: 'INITIAL_PURCHASE' }, t0));

    await deliver(transferDelivery('evt-t2', [before.appUserId], [after.appUserId], t0 + 1000));

    expect(await tuitionAt(after.deviceHash, t0 + day)).toBe(true);
    expect(await tuitionAt(before.deviceHash, t0 + day)).toBe(false);
  });

  it('ignores a delivery it has already taken in, even after newer events', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    const purchase = delivery(appUserId, { id: 'evt-p1', type: 'INITIAL_PURCHASE' }, t0);
    expect(await outcomeOf(deliver(purchase))).toBe('taken');
    expect(await outcomeOf(deliver(purchase))).toBe('seen');

    await deliver(
      delivery(
        appUserId,
        { id: 'evt-p2', type: 'EXPIRATION', expiration_at_ms: t0 + 1000 },
        t0 + 1000,
      ),
    );
    expect(await outcomeOf(deliver(purchase))).toBe('seen');
    expect(await tuitionAt(deviceHash, t0 + 2000)).toBe(false);
    const events = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM revenuecat_events WHERE id IN ('evt-p1', 'evt-p2')",
    ).first<{ n: number }>();
    expect(events?.n).toBe(2);
  });

  it('lets an older event arriving late change nothing', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    await deliver(
      delivery(
        appUserId,
        { id: 'evt-o2', type: 'EXPIRATION', expiration_at_ms: t0 + 1000 },
        t0 + 1000,
      ),
    );
    await deliver(delivery(appUserId, { id: 'evt-o1', type: 'INITIAL_PURCHASE' }, t0));
    expect(await tuitionAt(deviceHash, t0 + 2000)).toBe(false);
  });
});

describe('asking RevenueCat for a device with no record', () => {
  type Sent = { url: string; authorization: string | null };

  function revenueCat(answer: (url: string) => Response): Sent[] {
    const sent: Sent[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith(revenueCatApiBase)) {
        return Promise.reject(new Error(`unexpected request to ${url}`));
      }
      sent.push({ url, authorization: new Headers(init?.headers).get('Authorization') });
      return Promise.resolve(answer(url));
    });
    return sent;
  }

  const answers =
    (customer: Response) =>
    (url: string): Response =>
      url.includes('/entitlements') ? Response.json(entitlementsAnswer) : customer;

  it('asks once, keeps the answer, and believes it from then on', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    const sent = revenueCat(
      answers(
        Response.json(
          customerAnswer(appUserId, [
            { entitlement_id: tuitionEntitlementId, expires_at: t0 + 30 * day },
          ]),
        ),
      ),
    );

    expect(await tuitionAt(deviceHash, t0, apiEnv)).toBe(true);
    expect(sent[0]).toEqual({
      url: `${revenueCatApiBase}/projects/${projectId}/customers/${appUserId}`,
      authorization: 'Bearer sk_test_v2_key',
    });
    const asked = sent.length;
    expect(await tuitionAt(deviceHash, t0 + day, apiEnv)).toBe(true);
    expect(sent).toHaveLength(asked);
    expect(await tuitionAt(deviceHash, t0 + 31 * day, apiEnv)).toBe(false);
  });

  it('does not take another entitlement for tuition', async () => {
    const { deviceHash, appUserId } = await device();
    revenueCat(
      answers(
        Response.json(
          customerAnswer(appUserId, [{ entitlement_id: 'entlz9y8x7w6v5', expires_at: null }]),
        ),
      ),
    );
    expect(await tuitionAt(deviceHash, Date.now(), apiEnv)).toBe(false);
  });

  it('keeps a customer RevenueCat has never seen as no tuition, and asks again only after a while', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    const sent = revenueCat(() => Response.json(customerNotFound, { status: 404 }));

    expect(await tuitionAt(deviceHash, t0, apiEnv)).toBe(false);
    expect(await tuitionAt(deviceHash, t0 + 1000, apiEnv)).toBe(false);
    expect(sent).toHaveLength(1);
    expect(await storedRows(appUserId)).toBe(1);

    vi.restoreAllMocks();
    revenueCat(
      answers(
        Response.json(
          customerAnswer(appUserId, [{ entitlement_id: tuitionEntitlementId, expires_at: null }]),
        ),
      ),
    );
    expect(await tuitionAt(deviceHash, t0 + apiNoTuitionBelievedMs + 1000, apiEnv)).toBe(true);
  });

  it('keeps nothing when RevenueCat fails, and holds no tuition meanwhile', async () => {
    const { deviceHash, appUserId } = await device();
    const sent = revenueCat(() => new Response('upstream error', { status: 503 }));

    expect(await tuitionAt(deviceHash, Date.now(), apiEnv)).toBe(false);
    expect(sent).toHaveLength(1);
    expect(await storedRows(appUserId)).toBe(0);
  });

  it('never asks when the API is not set up', async () => {
    const { deviceHash } = await device();
    const sent = revenueCat(() => new Response(null, { status: 500 }));
    expect(await tuitionAt(deviceHash, Date.now(), webhookEnv)).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('lets the webhook’s word replace the API’s answer', async () => {
    const { deviceHash, appUserId } = await device();
    const t0 = Date.now();
    revenueCat(() => Response.json(customerNotFound, { status: 404 }));
    expect(await tuitionAt(deviceHash, t0, apiEnv)).toBe(false);

    await deliver(
      delivery(appUserId, { id: 'evt-after-api', type: 'INITIAL_PURCHASE' }, t0 - 1000),
    );
    expect(await tuitionAt(deviceHash, t0 + 1000, apiEnv)).toBe(true);
  });
});
