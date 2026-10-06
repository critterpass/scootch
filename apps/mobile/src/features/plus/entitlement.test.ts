import { describe, expect, it } from '@jest/globals';

import { ALWAYS_FREE, PLUS_ONLY, holdingsAfter, type PurchaseState } from '@scootch/domain';

import { plusMemory } from '../../data/plus-memory';
import { openTestDatabase } from '../../data/test/open-test-database';
import { createPlusStore } from '../../state/plus-store';

import { purchaseStateOf, unlockedFor } from './entitlement';
import { withKept } from './kept-records';
import { PLAN_PRODUCTS, PLUS_ENTITLEMENT } from './products';
import type { CustomerState } from './purchases-port';
import { customerFromStore, type StoreEntitlement } from './revenuecat-customer';
import { CUSTOMERS, fakePurchases, fakeStore } from './test/fake-purchases';

const EXPECTED: readonly [keyof typeof CUSTOMERS, PurchaseState, boolean][] = [
  ['free', 'free', false],
  ['trial', 'trial', true],
  ['monthly', 'monthly', true],
  ['yearly', 'yearly', true],
  ['yearlyRenewalOff', 'yearly', true],
  ['lifetime', 'lifetime', true],
  ['expired', 'expired', false],
  ['refunded', 'refunded', false],
];

describe('what a customer has unlocked', () => {
  it.each(EXPECTED)('reads %s as the %s purchase state', (name, state, plus) => {
    const customer: CustomerState = CUSTOMERS[name];
    expect(purchaseStateOf(customer)).toBe(state);
    const unlocked = unlockedFor(customer);
    expect(unlocked.plus).toBe(plus);
    expect(unlocked.startsPerDay).toBe(plus ? 3 : 1);
    for (const capability of ALWAYS_FREE) expect(unlocked.capabilities.has(capability)).toBe(true);
    for (const capability of PLUS_ONLY) expect(unlocked.capabilities.has(capability)).toBe(plus);
  });

  it('takes back nothing already caught or kept when Plus goes', () => {
    const holdings = {
      cards: 9,
      worldPieces: 9,
      surpriseDrops: 2,
      keptRecords: 3,
      finishedCards: 4,
    };
    for (const [name] of EXPECTED) {
      expect(holdingsAfter(holdings, purchaseStateOf(CUSTOMERS[name]))).toEqual(holdings);
    }
    // The shelf of kept records only ever grows.
    expect(withKept(['2026-W40'], '2026-W41')).toEqual(['2026-W40', '2026-W41']);
    expect(withKept(['2026-W40', '2026-W41'], '2026-W40')).toEqual(['2026-W40', '2026-W41']);
  });
});

describe("the store's own record, read into the app's words", () => {
  const UNTIL = Date.parse('2026-10-13T09:00:00.000Z');
  const entitlement = (changes: Partial<StoreEntitlement>): StoreEntitlement => ({
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    productIdentifier: PLAN_PRODUCTS.yearly,
    expirationDateMillis: UNTIL,
    ...changes,
  });
  const record = (active: StoreEntitlement | null, before: StoreEntitlement | null = active) => ({
    entitlements: {
      active: active ? { [PLUS_ENTITLEMENT]: active } : {},
      all: before ? { [PLUS_ENTITLEMENT]: before } : {},
    },
    allPurchasedProductIdentifiers: ['ink_midnight_riso', PLAN_PRODUCTS.yearly],
  });

  it('reads a trial with its end as the first charge', () => {
    const customer = customerFromStore(record(entitlement({ periodType: 'TRIAL' })));
    expect(customer).toMatchObject({
      activePlan: 'yearly',
      inTrial: true,
      trialEndsAt: UNTIL,
      renewsAt: UNTIL,
      willRenew: true,
    });
    expect(customer.ownedItems).toEqual(['ink_midnight_riso']);
  });

  it('reads a subscription with renewal off as still on, with an end and no next charge', () => {
    const customer = customerFromStore(record(entitlement({ willRenew: false })));
    expect(customer).toMatchObject({ activePlan: 'yearly', renewsAt: null, endsAt: UNTIL });
    expect(unlockedFor(customer).plus).toBe(true);
  });

  it('reads a lifetime purchase as never ending and never renewing', () => {
    const customer = customerFromStore(
      record(
        entitlement({
          productIdentifier: PLAN_PRODUCTS.lifetime,
          expirationDateMillis: null,
          willRenew: false,
        }),
      ),
    );
    expect(customer).toMatchObject({ activePlan: 'lifetime', renewsAt: null, endsAt: null });
  });

  it('reads an ended subscription as expired and a withdrawn lifetime as refunded', () => {
    const ended = entitlement({ isActive: false, willRenew: false });
    expect(purchaseStateOf(customerFromStore(record(null, ended)))).toBe('expired');
    const withdrawn = entitlement({
      isActive: false,
      productIdentifier: PLAN_PRODUCTS.lifetime,
      expirationDateMillis: null,
    });
    expect(purchaseStateOf(customerFromStore(record(null, withdrawn)))).toBe('refunded');
    expect(purchaseStateOf(customerFromStore(record(null, null)))).toBe('free');
  });
});

describe('the last known state', () => {
  it('survives a relaunch with no connection', async () => {
    const data = await openTestDatabase();
    const shop = fakeStore({ customer: CUSTOMERS.yearly });
    const first = createPlusStore({ port: fakePurchases(shop), memory: plusMemory(data.db) });
    await first.load();
    expect(await first.refresh()).toBe(true);

    // The app is started again with the store out of reach.
    shop.down = true;
    const second = createPlusStore({ port: fakePurchases(shop), memory: plusMemory(data.db) });
    expect(second.getState().unlocked.plus).toBe(false);
    await second.load();
    expect(second.getState()).toMatchObject({ loaded: true, customer: CUSTOMERS.yearly });
    expect(second.getState().unlocked.plus).toBe(true);
  });

  it('is never downgraded by an error while refreshing', async () => {
    const data = await openTestDatabase();
    const shop = fakeStore({ customer: CUSTOMERS.lifetime });
    const store = createPlusStore({ port: fakePurchases(shop), memory: plusMemory(data.db) });
    await store.load();
    await store.refresh();

    shop.down = true;
    shop.customer = CUSTOMERS.free;
    expect(await store.refresh()).toBe(false);
    expect(store.getState().customer).toEqual(CUSTOMERS.lifetime);
    expect(await plusMemory(data.db).read('customer')).toEqual(CUSTOMERS.lifetime);
  });

  it('follows the store down once the store itself says so', async () => {
    const data = await openTestDatabase();
    const shop = fakeStore({ customer: CUSTOMERS.trial });
    const port = fakePurchases(shop);
    const store = createPlusStore({ port, memory: plusMemory(data.db) });
    await store.load();
    await store.refresh();
    expect(store.getState().unlocked.plus).toBe(true);

    port.push(CUSTOMERS.expired);
    expect(store.getState().unlocked.plus).toBe(false);
    shop.customer = CUSTOMERS.refunded;
    await store.refresh();
    expect(purchaseStateOf(store.getState().customer)).toBe('refunded');
  });

  it('treats a stored value it cannot read as nothing stored', async () => {
    const data = await openTestDatabase();
    const memory = plusMemory(data.db);
    await memory.write('customer', { activePlan: 'platinum', inTrial: 'yes' });
    const store = createPlusStore({ port: fakePurchases(fakeStore({ down: true })), memory });
    await store.load();
    expect(store.getState().customer).toEqual(CUSTOMERS.free);
  });
});
