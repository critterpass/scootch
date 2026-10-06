import type { PlusStore } from '../../state/plus-store';

import type { PurchasesPort } from './purchases-port';

/** What changed while Apple's manage-subscriptions sheet was open. */
export type AppleSheetResult = 'renewal_off' | 'changed' | 'same' | 'unavailable';

/**
 * Cancelling and changing plan are Apple's steps: this opens Apple's own sheet, and when it has
 * closed reads the state again from the store. The app changes nothing itself and offers no undo.
 */
export async function throughAppleSheet(
  port: PurchasesPort,
  store: PlusStore,
): Promise<AppleSheetResult> {
  const before = store.getState().customer;
  try {
    await port.manageSubscriptions();
  } catch {
    return 'unavailable';
  }
  await store.refresh();
  const after = store.getState().customer;
  if (before.willRenew && !after.willRenew && after.activePlan !== null) return 'renewal_off';
  return after.activePlan !== before.activePlan || after.renewsAt !== before.renewsAt
    ? 'changed'
    : 'same';
}
