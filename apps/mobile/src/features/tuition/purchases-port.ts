import type { Instant } from '@phusclass/domain';

import type { PlanId } from './products';

/** One plan as the store sells it here and now. The price is the store's own localised text. */
export interface PlanOffer {
  readonly plan: PlanId;
  readonly productId: string;
  readonly priceText: string;
  /** The free trial this Apple ID is offered on the plan, in days; `null` when there is none. */
  readonly trialDays: number | null;
}

export interface Offerings {
  readonly plans: Readonly<Partial<Record<PlanId, PlanOffer>>>;
}

/** What the store says about this customer. Every date is the store's, never the phone's. */
export interface CustomerState {
  /** The plan that pays tuition right now; `null` when nothing does. */
  readonly activePlan: PlanId | null;
  /** The active plan is in its free trial. */
  readonly inTrial: boolean;
  /** When the trial ends and the first charge is made; `null` outside a trial. */
  readonly trialEndsAt: Instant | null;
  /** When the next renewal is charged; `null` when renewal is off or the plan never renews. */
  readonly renewsAt: Instant | null;
  /** When a subscription that will not renew runs out; `null` when it renews or never ends. */
  readonly endsAt: Instant | null;
  readonly willRenew: boolean;
  /** Why tuition lapsed, when it was paid before; `null` when it is paid or never was. */
  readonly lapse: 'expired' | 'refunded' | null;
}

export const FREE_CUSTOMER: CustomerState = {
  activePlan: null,
  inTrial: false,
  trialEndsAt: null,
  renewsAt: null,
  endsAt: null,
  willRenew: false,
  lapse: null,
};

export type PurchaseOutcome =
  | { readonly kind: 'purchased'; readonly customer: CustomerState }
  /** The person closed the store's sheet. Nothing is wrong and nothing is said. */
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed' };

/** Thrown by every call when the store cannot be used on this phone at all. */
export class PurchasesUnavailable extends Error {
  constructor() {
    super('Purchases are unavailable');
    this.name = 'PurchasesUnavailable';
  }
}

/**
 * Everything the app asks of the store. The app talks to this and never to an SDK, so the same
 * screens run on RevenueCat, on a fake in tests, and on a phone with no store at all.
 */
export interface PurchasesPort {
  /** False when no store is configured: every call then rejects with `PurchasesUnavailable`. */
  readonly available: boolean;
  /** The plans, with their localised prices. */
  offerings(): Promise<Offerings>;
  purchase(productId: string): Promise<PurchaseOutcome>;
  /** Brings back what this Apple ID bought. No account is involved. */
  restore(): Promise<CustomerState>;
  customer(): Promise<CustomerState>;
  /** Opens Apple's own manage-subscriptions sheet, and resolves when it has closed. */
  manageSubscriptions(): Promise<void>;
  /** Tells the app when the store reports a change by itself. Returns the unsubscribe. */
  onCustomerChange(listener: (customer: CustomerState) => void): () => void;
}

/** The port of a phone with no store: nothing can be bought, and it says so. */
export const unavailablePurchases: PurchasesPort = {
  available: false,
  offerings: () => Promise.reject(new PurchasesUnavailable()),
  purchase: () => Promise.reject(new PurchasesUnavailable()),
  restore: () => Promise.reject(new PurchasesUnavailable()),
  customer: () => Promise.reject(new PurchasesUnavailable()),
  manageSubscriptions: () => Promise.reject(new PurchasesUnavailable()),
  onCustomerChange: () => () => undefined,
};
