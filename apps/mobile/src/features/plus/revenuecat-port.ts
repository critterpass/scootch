import Purchases, {
  PRODUCT_CATEGORY,
  type CustomerInfo,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import type { HttpClient } from '../../api/http-client';
import { plusMemory } from '../../data/plus-memory';
import type { SqlDatabase } from '../../data/table';

import { planOfProduct, PLAN_PRODUCTS, PLANS, type PlanId } from './products';
import {
  PurchasesUnavailable,
  unavailablePurchases,
  type CustomerState,
  type Offerings,
  type PlanOffer,
  type PurchasesPort,
} from './purchases-port';
import { customerFromStore } from './revenuecat-customer';
import { askStoreCustomerId, storeIdentity } from './store-identity';

// RevenueCat behind the port. Nothing here is covered by the unit tests, which use the fake port:
// it runs only in a native build with products in the store.

const DAYS_IN: Readonly<Record<string, number>> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** The free trial the store offers on a product, in days; `null` when the intro is not free. */
function trialDaysOf(product: PurchasesStoreProduct): number | null {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const perUnit = DAYS_IN[intro.periodUnit];
  return perUnit === undefined ? null : perUnit * intro.periodNumberOfUnits * intro.cycles;
}

/**
 * Whether this Apple ID can still take the free trial. A product carries its trial whoever asks,
 * so the store is asked about the person; anything but a clear yes promises no trial.
 */
async function trialOpenFor(productId: string): Promise<boolean> {
  try {
    const answers = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    return (
      answers[productId]?.status ===
      Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
    );
  } catch {
    return false;
  }
}

function cancelledByUser(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'userCancelled' in error
    ? error.userCancelled === true
    : false;
}

/**
 * The store on a real phone, known by the id the server handed out whenever it can be had. With
 * no public SDK key in the app's config the SDK is never configured and the port reports that
 * purchases are unavailable, as it does when the SDK refuses to be configured.
 */
export function revenueCatPurchases(
  apiKey: string | undefined,
  phone: { readonly db: SqlDatabase; readonly http: Pick<HttpClient, 'request'> },
): PurchasesPort {
  if (!apiKey) return unavailablePurchases;
  const identity = storeIdentity({
    // The id is kept with the rest of Plus's memory and asked of the server by the app's client.
    memory: plusMemory(phone.db),
    customerId: () => askStoreCustomerId(phone.http),
    configure: (appUserID) => {
      Purchases.configure(appUserID === null ? { apiKey } : { apiKey, appUserID });
    },
    logIn: async (appUserId) => {
      await Purchases.logIn(appUserId);
    },
  });
  let available = true;
  // The SDK is configured once the stored id has been read; nothing reaches it before that.
  const configured = identity.start().catch(() => {
    available = false;
  });
  const ready = async () => {
    await configured;
    if (!available) throw new PurchasesUnavailable();
  };
  return {
    get available() {
      return available;
    },
    ...storePort(ready, identity.beforeBuying),
  };
}

/**
 * The SDK's calls, each made once `ready` resolves. A purchase or a restore also waits for
 * `beforeBuying`, so it is made under the server's id whenever that can be had.
 */
function storePort(
  ready: () => Promise<void>,
  beforeBuying: () => Promise<void>,
): Omit<PurchasesPort, 'available'> {
  const products = new Map<string, PurchasesStoreProduct>();
  const read = (info: CustomerInfo): CustomerState => customerFromStore(info);

  const load = async (ids: readonly string[], category: PRODUCT_CATEGORY) => {
    if (ids.length === 0) return [];
    const found = await Purchases.getProducts([...ids], category);
    for (const product of found) products.set(product.identifier, product);
    return found;
  };

  return {
    offerings: async (itemProductIds): Promise<Offerings> => {
      await ready();
      const subscriptions = [PLAN_PRODUCTS.monthly, PLAN_PRODUCTS.yearly];
      const single = [PLAN_PRODUCTS.lifetime, ...itemProductIds];
      const found = [
        ...(await load(subscriptions, PRODUCT_CATEGORY.SUBSCRIPTION)),
        ...(await load(single, PRODUCT_CATEGORY.NON_SUBSCRIPTION)),
      ];
      const trialOpen = await trialOpenFor(PLAN_PRODUCTS.yearly);
      const plans: Partial<Record<PlanId, PlanOffer>> = {};
      const items: Record<string, { productId: string; priceText: string }> = {};
      for (const product of found) {
        const plan = planOfProduct(product.identifier);
        if (plan === null) {
          items[product.identifier] = {
            productId: product.identifier,
            priceText: product.priceString,
          };
        } else {
          plans[plan] = {
            plan,
            productId: product.identifier,
            priceText: product.priceString,
            trialDays: plan === 'yearly' && trialOpen ? trialDaysOf(product) : null,
          };
        }
      }
      if (!PLANS.some((plan) => plans[plan])) throw new Error('The store listed no plans');
      return { plans, items };
    },
    purchase: async (productId) => {
      try {
        await ready();
        await beforeBuying();
        const product =
          products.get(productId) ?? (await load([productId], categoryOf(productId)))[0];
        if (!product) return { kind: 'failed' };
        const { customerInfo } = await Purchases.purchaseStoreProduct(product);
        return { kind: 'purchased', customer: read(customerInfo) };
      } catch (error) {
        return cancelledByUser(error) ? { kind: 'cancelled' } : { kind: 'failed' };
      }
    },
    restore: async () => {
      await ready();
      await beforeBuying();
      return read(await Purchases.restorePurchases());
    },
    customer: async () => {
      await ready();
      return read(await Purchases.getCustomerInfo());
    },
    manageSubscriptions: async () => {
      await ready();
      await Purchases.showManageSubscriptions();
    },
    onCustomerChange: (listener) => {
      const heard = (info: CustomerInfo) => listener(read(info));
      Purchases.addCustomerInfoUpdateListener(heard);
      return () => void Purchases.removeCustomerInfoUpdateListener(heard);
    },
  };
}

function categoryOf(productId: string): PRODUCT_CATEGORY {
  const plan = planOfProduct(productId);
  return plan === 'monthly' || plan === 'yearly'
    ? PRODUCT_CATEGORY.SUBSCRIPTION
    : PRODUCT_CATEGORY.NON_SUBSCRIPTION;
}
