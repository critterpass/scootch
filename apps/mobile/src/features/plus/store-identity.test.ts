import { describe, expect, it } from '@jest/globals';

import { createHttpClient } from '../../api/http-client';
import { plusMemory } from '../../data/plus-memory';
import { openTestDatabase, type TestDatabase } from '../../data/test/open-test-database';

import { PLAN_PRODUCTS } from './products';
import { askStoreCustomerId, storeIdentity } from './store-identity';
import {
  CUSTOMERS,
  fakePurchases,
  fakeStore,
  fakeStoreSignIn,
  type FakeStore,
} from './test/fake-purchases';

const BASE_URL = 'https://api.test';
const TOKEN = 'a'.repeat(43);
// The answer the customer route gives, as recorded from the server.
const CUSTOMER_ANSWER = {
  appUserId: '3f6c1e0b9a24d87c5e1f0a3b6d9c2e4f7a8b1c0d3e6f9a2b5c8d1e4f7a0b3c6d',
};
const ID = CUSTOMER_ANSWER.appUserId;
const CUSTOMER_CALL = 'GET /v1/plus/customer';

/** The API as the phone reaches it: up and answering, down, or never answering. */
type Api = 'up' | 'down' | 'silent';

/** A server whose customer route answers by the state of `api`, noting each call in the store's. */
function apiOn(shop: FakeStore, api: { state: Api }) {
  const fetchFake = ((url: string, init: RequestInit) => {
    shop.calls.push(`${init.method} ${url.replace(BASE_URL, '')}`);
    if (api.state === 'down') return Promise.reject(new TypeError('Network request failed'));
    if (api.state === 'silent') {
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    }
    return Promise.resolve(
      new Response(JSON.stringify(CUSTOMER_ANSWER), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as typeof fetch;
  return createHttpClient({
    baseUrl: BASE_URL,
    fetch: fetchFake,
    tokens: { read: () => Promise.resolve(TOKEN), write: () => Promise.resolve() },
    language: () => 'en',
    timeoutMs: 200,
  });
}

/** Lets what a launch started by itself run to its end. */
async function settle() {
  for (let turn = 0; turn < 20; turn += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

/** One launch of the app on this phone's database: the store set up, then the port. */
async function launch(data: TestDatabase, api: { state: Api }, patienceMs = 1_000) {
  const shop = fakeStore({ nextPurchase: CUSTOMERS.yearly, customer: CUSTOMERS.monthly });
  const http = apiOn(shop, api);
  const memory = plusMemory(data.db);
  const identity = storeIdentity({
    memory,
    customerId: () => askStoreCustomerId(http),
    ...fakeStoreSignIn(shop),
    patienceMs,
  });
  await identity.start();
  const port = fakePurchases(shop, identity.beforeBuying);
  return { shop, port, memory };
}

describe('the store knows this phone by the id the server hands out', () => {
  it('fetches the id and logs in with it before the first purchase, then keeps it', async () => {
    const data = await openTestDatabase();
    const { shop, port, memory } = await launch(data, { state: 'up' });

    const outcome = await port.purchase(PLAN_PRODUCTS.yearly);

    expect(outcome).toEqual({ kind: 'purchased', customer: CUSTOMERS.yearly });
    expect(shop.calls).toEqual([
      'configure anonymous',
      CUSTOMER_CALL,
      `logIn ${ID}`,
      `purchase ${PLAN_PRODUCTS.yearly}`,
    ]);
    expect(await memory.read('storeCustomerId')).toBe(ID);
  });

  it('logs in before a restore too', async () => {
    const data = await openTestDatabase();
    const { shop, port } = await launch(data, { state: 'up' });

    await port.restore();

    expect(shop.calls.indexOf(`logIn ${ID}`)).toBeGreaterThan(-1);
    expect(shop.calls.indexOf(`logIn ${ID}`)).toBeLessThan(shop.calls.indexOf('restore'));
  });

  it('sets the store up under the kept id on the next launch, with no second log-in', async () => {
    const data = await openTestDatabase();
    const first = await launch(data, { state: 'up' });
    await first.port.purchase(PLAN_PRODUCTS.yearly);

    const { shop, port } = await launch(data, { state: 'up' });
    await port.purchase(PLAN_PRODUCTS.monthly);
    await settle();

    expect(shop.calls[0]).toBe(`configure ${ID}`);
    expect(shop.calls).toContain(CUSTOMER_CALL);
    expect(shop.calls).toContain(`purchase ${PLAN_PRODUCTS.monthly}`);
    expect(shop.calls.filter((call) => call.startsWith('logIn'))).toEqual([]);
  });
});

describe('with no server, buying and restoring go ahead anonymously', () => {
  it('buys and restores without logging in, and keeps nothing', async () => {
    const data = await openTestDatabase();
    const { shop, port, memory } = await launch(data, { state: 'down' });

    expect(await port.purchase(PLAN_PRODUCTS.lifetime)).toEqual({
      kind: 'purchased',
      customer: CUSTOMERS.yearly,
    });
    expect(await port.restore()).toEqual(CUSTOMERS.yearly);

    expect(shop.calls[0]).toBe('configure anonymous');
    expect(shop.calls).toContain(`purchase ${PLAN_PRODUCTS.lifetime}`);
    expect(shop.calls).toContain('restore');
    expect(shop.calls.filter((call) => call.startsWith('logIn'))).toEqual([]);
    expect(await memory.read('storeCustomerId')).toBeNull();
  });

  it('does not hold a purchase up when the server never answers', async () => {
    const data = await openTestDatabase();
    const { shop, port } = await launch(data, { state: 'silent' }, 5);

    const outcome = await port.purchase(PLAN_PRODUCTS.yearly);

    expect(outcome.kind).toBe('purchased');
    expect(shop.calls.filter((call) => call.startsWith('logIn'))).toEqual([]);
  });

  it('logs in on the next launch once the server answers, and keeps the id from then on', async () => {
    const data = await openTestDatabase();
    const offline = await launch(data, { state: 'down' });
    await offline.port.purchase(PLAN_PRODUCTS.yearly);

    const online = await launch(data, { state: 'up' });
    // The launch logs in by itself, without waiting for a purchase.
    await settle();

    expect(online.shop.calls.slice(0, 3)).toEqual([
      'configure anonymous',
      CUSTOMER_CALL,
      `logIn ${ID}`,
    ]);
    expect(await online.memory.read('storeCustomerId')).toBe(ID);

    const later = await launch(data, { state: 'up' });
    expect(later.shop.calls[0]).toBe(`configure ${ID}`);
  });
});
