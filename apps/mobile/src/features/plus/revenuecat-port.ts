import Purchases, {
  PRODUCT_CATEGORY,
  type CustomerInfo,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import { planOfProduct, PLAN_PRODUCTS, PLANS, type PlanId } from './products';
import {
  unavailablePurchases,
  type CustomerState,
  type Offerings,
  type PlanOffer,
  type PurchasesPort,
} from './purchases-port';
import { customerFromStore } from './revenuecat-customer';

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
 * The store on a real phone. With no public SDK key in the app's config the SDK is never
 * configured and the port reports that purchases are unavailable.
 */
export function revenueCatPurchases(apiKey: string | undefined): PurchasesPort {
  if (!apiKey) return unavailablePurchases;
  try {
    Purchases.configure({ apiKey });
  } catch {
    return unavailablePurchases;
  }
  const products = new Map<string, PurchasesStoreProduct>();
  const read = (info: CustomerInfo): CustomerState => customerFromStore(info);

  const load = async (ids: readonly string[], category: PRODUCT_CATEGORY) => {
    if (ids.length === 0) return [];
    const found = await Purchases.getProducts([...ids], category);
    for (const product of found) products.set(product.identifier, product);
    return found;
  };

  return {
    available: true,
    offerings: async (itemProductIds): Promise<Offerings> => {
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
        const product =
          products.get(productId) ?? (await load([productId], categoryOf(productId)))[0];
        if (!product) return { kind: 'failed' };
        const { customerInfo } = await Purchases.purchaseStoreProduct(product);
        return { kind: 'purchased', customer: read(customerInfo) };
      } catch (error) {
        return cancelledByUser(error) ? { kind: 'cancelled' } : { kind: 'failed' };
      }
    },
    restore: async () => read(await Purchases.restorePurchases()),
    customer: async () => read(await Purchases.getCustomerInfo()),
    manageSubscriptions: () => Purchases.showManageSubscriptions(),
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
