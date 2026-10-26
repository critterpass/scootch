import type { Instant } from '@phusclass/domain';

import type { PlanId } from './products';

/** A store period: Apple's free week is `{ unit: 'WEEK', count: 1 }`. */
export interface StorePeriod {
  readonly unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  readonly count: number;
}

/** A free stretch the store offers this Apple ID before the first charge. */
export interface FreeOffer {
  /** The store's id for the offer; empty for a plan's introductory free trial. */
  readonly id: string;
  readonly period: StorePeriod;
}

/** One plan as the store sells it here and now. The price is the store's own localised text. */
export interface PlanOffer {
  readonly plan: PlanId;
  readonly productId: string;
  /** The store's localised price, "$39.99" or "499.000 ₫". */
  readonly priceText: string;
  /** The same price as a number in the store's currency, for comparing the two plans. */
  readonly price: number;
  /** The yearly price spread over twelve months, as the store writes it; `null` for a month. */
  readonly perMonthText: string | null;
  /** The free trial this Apple ID is offered on the plan; `null` when there is none. */
  readonly trial: FreeOffer | null;
  /** Apple's win-back offer for someone whose tuition lapsed; `null` when none is offered. */
  readonly winBack: FreeOffer | null;
}

export interface Offerings {
  readonly plans: Readonly<Partial<Record<PlanId, PlanOffer>>>;
}

/** What the store says about this customer. Every date is the store's, never the phone's. */
export interface CustomerState {
  /** The plan that pays tuition right now; `null` when nothing does. */
  readonly activePlan: PlanId | null;
  /** Tuition is held through a scholarship (a promotional grant), not a plan. */
  readonly scholarship: boolean;
  /** When the scholarship ends; `null` without one. */
  readonly scholarshipEndsAt: Instant | null;
  /** The active plan is in its free trial. */
  readonly inTrial: boolean;
  /** When the trial ends and the first charge is made; `null` outside a trial. */
  readonly trialEndsAt: Instant | null;
  /** When the next renewal is charged; `null` when renewal is off or the plan never renews. */
  readonly renewsAt: Instant | null;
  /** When a subscription that will not renew runs out; `null` when it renews or never ends. */
  readonly endsAt: Instant | null;
  readonly willRenew: boolean;
  /** Tuition was paid before and has lapsed; `null` when it is held or never was. */
  readonly lapse: 'expired' | null;
}

export const FREE_CUSTOMER: CustomerState = {
  activePlan: null,
  scholarship: false,
  scholarshipEndsAt: null,
  inTrial: false,
  trialEndsAt: null,
  renewsAt: null,
  endsAt: null,
  willRenew: false,
  lapse: null,
};

export type PurchaseOutcome =
  | { readonly kind: 'purchased'; readonly customer: CustomerState }
  /** Ask to Buy: the family organiser has to say yes. Nothing is charged until they do. */
  | { readonly kind: 'pending' }
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
  /** The plans, with their localised prices and any free stretch on offer. */
  offerings(): Promise<Offerings>;
  /** Buys a plan; with `winBack`, through Apple's win-back offer of that id. */
  purchase(productId: string, winBack?: string): Promise<PurchaseOutcome>;
  /** Brings back what this Apple ID bought. No account is involved. */
  restore(): Promise<CustomerState>;
  /** What the store says now; `fresh` skips the store's cache, after the server changed it. */
  customer(fresh?: boolean): Promise<CustomerState>;
  /** Opens Apple's own manage-subscriptions sheet, and resolves when it has closed. */
  manageSubscriptions(): Promise<void>;
  /** Tells the app when the store reports a change by itself. Returns the unsubscribe. */
  onCustomerChange(listener: (customer: CustomerState) => void): () => void;
  /**
   * Resolves once the store knows this phone by the id the server hands out, so a scholarship the
   * server grants shows up here. Rejects when that cannot be had now.
   */
  linked(): Promise<void>;
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
  linked: () => Promise.reject(new PurchasesUnavailable()),
};
