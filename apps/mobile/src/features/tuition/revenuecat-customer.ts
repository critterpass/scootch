import { planOfProduct, TUITION_ENTITLEMENT } from './products';
import { FREE_CUSTOMER, type CustomerState } from './purchases-port';

/** The parts of RevenueCat's entitlement record this app reads. */
export interface StoreEntitlement {
  readonly isActive: boolean;
  readonly willRenew: boolean;
  readonly periodType: string;
  readonly store: string;
  readonly productIdentifier: string;
  readonly expirationDateMillis: number | null;
}

/** The parts of RevenueCat's customer record this app reads. */
export interface StoreCustomer {
  readonly entitlements: {
    readonly active: Readonly<Record<string, StoreEntitlement>>;
    readonly all: Readonly<Record<string, StoreEntitlement>>;
  };
}

/**
 * RevenueCat's customer record in the app's own words. Pure, so the mapping is tested without the
 * SDK. Tuition is the `tuition` entitlement and nothing else; a promotional grant is the
 * scholarship, which never renews and is never charged.
 */
export function customerFromStore(store: StoreCustomer): CustomerState {
  const active = store.entitlements.active[TUITION_ENTITLEMENT];
  if (active?.isActive) {
    const until = active.expirationDateMillis;
    if (active.store === 'PROMOTIONAL') {
      return { ...FREE_CUSTOMER, scholarship: true, scholarshipEndsAt: until };
    }
    const plan = planOfProduct(active.productIdentifier);
    // A product this build does not know still pays tuition: it is read as the school year.
    const activePlan = plan ?? 'yearly';
    const inTrial = active.periodType === 'TRIAL';
    return {
      ...FREE_CUSTOMER,
      activePlan,
      inTrial,
      trialEndsAt: inTrial ? until : null,
      renewsAt: active.willRenew ? until : null,
      endsAt: active.willRenew ? null : until,
      willRenew: active.willRenew,
    };
  }
  const before = store.entitlements.all[TUITION_ENTITLEMENT];
  // A scholarship that ran out is not a lapse: nobody paid, so there is nothing to win back.
  if (!before || before.store === 'PROMOTIONAL') return FREE_CUSTOMER;
  return { ...FREE_CUSTOMER, lapse: 'expired' };
}

/** Tuition is held: a plan pays it, in its free week or after, or a scholarship does. */
export function isEnrolled(customer: CustomerState): boolean {
  return customer.activePlan !== null || customer.scholarship;
}

/** The next charge the store will make, if any: the trial's end or the next renewal. */
export function nextChargeAt(customer: CustomerState): number | null {
  if (customer.activePlan === null || !customer.willRenew) return null;
  return customer.inTrial ? customer.trialEndsAt : customer.renewsAt;
}
