import { planOfProduct, PLAN_PRODUCTS, PLANS, PLUS_ENTITLEMENT, type PlanId } from './products';
import { FREE_CUSTOMER, type CustomerState } from './purchases-port';

/** The parts of RevenueCat's entitlement record this app reads. */
export interface StoreEntitlement {
  readonly isActive: boolean;
  readonly willRenew: boolean;
  readonly periodType: string;
  readonly productIdentifier: string;
  readonly expirationDateMillis: number | null;
}

/** The parts of RevenueCat's customer record this app reads. */
export interface StoreCustomer {
  readonly entitlements: {
    readonly active: Readonly<Record<string, StoreEntitlement>>;
    readonly all: Readonly<Record<string, StoreEntitlement>>;
  };
  readonly allPurchasedProductIdentifiers: readonly string[];
}

const PLAN_PRODUCT_IDS: readonly string[] = PLANS.map((plan) => PLAN_PRODUCTS[plan]);

/**
 * Reads RevenueCat's customer record into the app's own words. Pure, so the mapping is tested
 * without the SDK. A lifetime purchase has no end, so an inactive one can only have been
 * refunded; an inactive subscription is reported as expired, which unlocks exactly the same.
 */
export function customerFromStore(store: StoreCustomer): CustomerState {
  const ownedItems = store.allPurchasedProductIdentifiers.filter(
    (id) => !PLAN_PRODUCT_IDS.includes(id),
  );
  const active = store.entitlements.active[PLUS_ENTITLEMENT];
  if (active?.isActive) {
    const plan: PlanId = planOfProduct(active.productIdentifier) ?? 'lifetime';
    const until = active.expirationDateMillis;
    if (plan === 'lifetime' || until === null) {
      return { ...FREE_CUSTOMER, activePlan: 'lifetime', ownedItems };
    }
    const inTrial = active.periodType === 'TRIAL';
    return {
      activePlan: plan,
      inTrial,
      trialEndsAt: inTrial ? until : null,
      renewsAt: active.willRenew ? until : null,
      endsAt: active.willRenew ? null : until,
      willRenew: active.willRenew,
      lapse: null,
      ownedItems,
    };
  }
  const before = store.entitlements.all[PLUS_ENTITLEMENT];
  if (!before) return { ...FREE_CUSTOMER, ownedItems };
  const wasLifetime =
    planOfProduct(before.productIdentifier) === 'lifetime' || before.expirationDateMillis === null;
  return { ...FREE_CUSTOMER, lapse: wasLifetime ? 'refunded' : 'expired', ownedItems };
}
