import {
  unlockedBy,
  type PurchaseState,
  type StoreSubscription,
  type Unlocked,
} from '@scootch/domain';

import type { CustomerState } from './purchases-port';

/** Where the store's report puts this customer among the domain's purchase states. */
export function purchaseStateOf(customer: CustomerState): PurchaseState {
  if (customer.activePlan === 'lifetime') return 'lifetime';
  if (customer.activePlan !== null) return customer.inTrial ? 'trial' : customer.activePlan;
  if (customer.lapse === 'refunded') return 'refunded';
  if (customer.lapse === 'expired') return 'expired';
  return 'free';
}

/** What is unlocked. The domain's one function decides; nothing here adds or removes anything. */
export function unlockedFor(customer: CustomerState): Unlocked {
  return unlockedBy(purchaseStateOf(customer));
}

/** The subscription as the charge reminders read it; `null` when nothing can be charged. */
export function subscriptionOf(customer: CustomerState): StoreSubscription | null {
  if (customer.activePlan !== 'monthly' && customer.activePlan !== 'yearly') return null;
  return {
    plan: customer.activePlan,
    trialEndsAt: customer.inTrial ? customer.trialEndsAt : null,
    renewsAt: customer.renewsAt,
    willRenew: customer.willRenew,
  };
}
