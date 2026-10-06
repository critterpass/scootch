import { PLAN_PRODUCTS } from '../products';
import {
  FREE_CUSTOMER,
  type CustomerState,
  type Offerings,
  type PurchaseOutcome,
  type PurchasesPort,
} from '../purchases-port';

// The store for tests and registry captures. Its prices are deliberately not real money amounts,
// so a test can tell a price that came from the store from one written into a screen.

export const FAKE_PRICES = { monthly: '¤M.mm', yearly: '¤Y.yy', lifetime: '¤L.ll' } as const;

export const FAKE_OFFERINGS: Offerings = {
  plans: {
    monthly: {
      plan: 'monthly',
      productId: PLAN_PRODUCTS.monthly,
      priceText: FAKE_PRICES.monthly,
      trialDays: null,
    },
    yearly: {
      plan: 'yearly',
      productId: PLAN_PRODUCTS.yearly,
      priceText: FAKE_PRICES.yearly,
      trialDays: 7,
    },
    lifetime: {
      plan: 'lifetime',
      productId: PLAN_PRODUCTS.lifetime,
      priceText: FAKE_PRICES.lifetime,
      trialDays: null,
    },
  },
  items: {},
};

export interface FakeStore {
  /** What the store would answer for the customer right now. */
  customer: CustomerState;
  /** When true every call to the store fails, as with no connection. */
  down: boolean;
  offerings: Offerings;
  /** What the next purchase does; a `CustomerState` means it goes through and leaves that state. */
  nextPurchase: CustomerState | 'cancelled' | 'failed';
  /** What the customer becomes once Apple's manage sheet closes. */
  afterManage: CustomerState | null;
  readonly calls: string[];
}

export function fakeStore(changes: Partial<FakeStore> = {}): FakeStore {
  return {
    customer: FREE_CUSTOMER,
    down: false,
    offerings: FAKE_OFFERINGS,
    nextPurchase: 'failed',
    afterManage: null,
    calls: [],
    ...changes,
  };
}

/** A port on a fake store. It never touches a network or an SDK. */
export function fakePurchases(store: FakeStore): PurchasesPort & {
  /** The store reports a change by itself, as after a renewal or a refund. */
  push(customer: CustomerState): void;
} {
  const listeners = new Set<(customer: CustomerState) => void>();
  const reach = <T>(name: string, answer: () => T): Promise<T> => {
    store.calls.push(name);
    return store.down
      ? Promise.reject(new Error('The store cannot be reached'))
      : Promise.resolve(answer());
  };
  return {
    available: true,
    offerings: () => reach('offerings', () => store.offerings),
    purchase: (productId) =>
      reach(`purchase ${productId}`, (): PurchaseOutcome => {
        const next = store.nextPurchase;
        if (next === 'cancelled' || next === 'failed') return { kind: next };
        store.customer = next;
        return { kind: 'purchased', customer: next };
      }).catch((): PurchaseOutcome => ({ kind: 'failed' })),
    restore: () => reach('restore', () => store.customer),
    customer: () => reach('customer', () => store.customer),
    manageSubscriptions: () =>
      reach('manage', () => {
        if (store.afterManage) store.customer = store.afterManage;
      }),
    onCustomerChange: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    push(customer) {
      store.customer = customer;
      for (const listener of listeners) listener(customer);
    },
  };
}

const AT = Date.parse('2026-10-06T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

/** One customer for each state the store can report. */
export const CUSTOMERS = {
  free: FREE_CUSTOMER,
  trial: {
    ...FREE_CUSTOMER,
    activePlan: 'yearly',
    inTrial: true,
    trialEndsAt: AT + 7 * DAY,
    renewsAt: AT + 7 * DAY,
    willRenew: true,
  },
  monthly: { ...FREE_CUSTOMER, activePlan: 'monthly', renewsAt: AT + 30 * DAY, willRenew: true },
  yearly: { ...FREE_CUSTOMER, activePlan: 'yearly', renewsAt: AT + 365 * DAY, willRenew: true },
  yearlyRenewalOff: { ...FREE_CUSTOMER, activePlan: 'yearly', endsAt: AT + 365 * DAY },
  lifetime: { ...FREE_CUSTOMER, activePlan: 'lifetime' },
  expired: { ...FREE_CUSTOMER, lapse: 'expired' },
  refunded: { ...FREE_CUSTOMER, lapse: 'refunded' },
} as const satisfies Record<string, CustomerState>;
