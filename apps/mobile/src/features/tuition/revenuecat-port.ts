import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  type PurchasesStoreProduct,
  type PurchasesWinBackOffer,
} from 'react-native-purchases';

import type { HttpClient } from '../../api/http-client';
import type { DataDatabase } from '../../data/data-database';
import { readKv, writeKv } from '../../data/kv-repository';

import { PLAN_PACKAGES, PLANS, type PlanId } from './products';
import {
  PurchasesUnavailable,
  unavailablePurchases,
  type FreeOffer,
  type Offerings,
  type PlanOffer,
  type PurchasesPort,
  type StorePeriod,
} from './purchases-port';
import { customerFromStore } from './revenuecat-customer';
import { askStoreCustomerId, storeIdentity } from './store-identity';

// RevenueCat behind the port. Nothing here is covered by the unit tests, which test the pure
// mapping and the rules: it runs only in a native build with products in the store.

/** The offering the receipt sells from. */
const OFFERING = 'default';
const STORE_ID_KEY = 'tuition.store-customer-id';
/** RevenueCat's error code for a purchase waiting on Ask to Buy. */
const PAYMENT_PENDING = '20';
const UNITS: ReadonlySet<string> = new Set(['DAY', 'WEEK', 'MONTH', 'YEAR']);

function periodOf(unit: string, count: number): StorePeriod | null {
  return UNITS.has(unit) && count > 0 ? { unit: unit as StorePeriod['unit'], count } : null;
}

/** The product's free trial as the store sells it; `null` when its intro is not free. */
function trialOf(product: PurchasesStoreProduct): FreeOffer | null {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const period = periodOf(intro.periodUnit, intro.periodNumberOfUnits * Math.max(1, intro.cycles));
  return period === null ? null : { id: '', period };
}

/** Whether this Apple ID can still take the free trial. Anything but a clear yes is no. */
async function trialOpenFor(productIds: readonly string[]): Promise<Set<string>> {
  try {
    const answers = await Purchases.checkTrialOrIntroductoryPriceEligibility([...productIds]);
    return new Set(
      productIds.filter(
        (id) =>
          answers[id]?.status ===
          Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      ),
    );
  } catch {
    return new Set();
  }
}

/**
 * Apple's win-back offer for this product, when the store surfaces one (StoreKit 2, iOS 18 and
 * later, for someone whose subscription lapsed). Where none is surfaced, the receipt offers the
 * plan as it is, and the gap is logged in development so it can be seen.
 */
async function winBackFor(
  product: PurchasesStoreProduct,
): Promise<{ offer: FreeOffer; store: PurchasesWinBackOffer } | null> {
  try {
    const found = await Purchases.getEligibleWinBackOffersForProduct(product);
    const first = found?.[0];
    if (first === undefined) return null;
    const period = periodOf(
      first.periodUnit,
      first.periodNumberOfUnits * Math.max(1, first.cycles),
    );
    if (first.price !== 0 || period === null) return null;
    return { offer: { id: first.identifier, period }, store: first };
  } catch {
    if (__DEV__) console.info('tuition: no win-back offer surfaced by the store');
    return null;
  }
}

function errorCodeOf(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null;
}

function cancelledByUser(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'userCancelled' in error
    ? error.userCancelled === true
    : false;
}

/**
 * The store on a real phone, known by the id the server hands out whenever it can be had. With
 * no public SDK key in the app's config the SDK is never configured and the port reports that
 * purchases are unavailable, as it does when the SDK refuses to be configured.
 */
export function revenueCatPurchases(
  apiKey: string | undefined,
  phone: { readonly db: DataDatabase; readonly http: Pick<HttpClient, 'request'> },
): PurchasesPort {
  if (!apiKey) return unavailablePurchases;
  const identity = storeIdentity({
    memory: {
      read: () => readKv(phone.db, STORE_ID_KEY),
      write: (id) => writeKv(phone.db, STORE_ID_KEY, id, Date.now()),
    },
    customerId: () => askStoreCustomerId(phone.http),
    configure: (appUserID) => {
      Purchases.configure(appUserID === null ? { apiKey } : { apiKey, appUserID });
    },
    logIn: async (appUserId) => {
      await Purchases.logIn(appUserId);
    },
  });
  let available = true;
  const configured = identity.start().catch(() => {
    available = false;
  });
  const ready = async () => {
    await configured;
    if (!available) throw new PurchasesUnavailable();
  };

  const packages = new Map<string, PurchasesPackage>();
  const winBacks = new Map<string, PurchasesWinBackOffer>();

  return {
    get available() {
      return available;
    },
    offerings: async (): Promise<Offerings> => {
      await ready();
      const all = await Purchases.getOfferings();
      const offering = all.all[OFFERING] ?? all.current;
      if (!offering) throw new Error('The store listed no offering');
      const found = PLANS.map((plan) => ({
        plan,
        pkg: offering.availablePackages.find((one) => one.identifier === PLAN_PACKAGES[plan]),
      })).filter((one): one is { plan: PlanId; pkg: PurchasesPackage } => one.pkg !== undefined);
      if (found.length === 0) throw new Error('The store listed no plans');
      const trialOpen = await trialOpenFor(found.map(({ pkg }) => pkg.product.identifier));
      const plans: Partial<Record<PlanId, PlanOffer>> = {};
      for (const { plan, pkg } of found) {
        const product = pkg.product;
        packages.set(product.identifier, pkg);
        const winBack = trialOpen.has(product.identifier) ? null : await winBackFor(product);
        if (winBack !== null) winBacks.set(winBack.offer.id, winBack.store);
        plans[plan] = {
          plan,
          productId: product.identifier,
          priceText: product.priceString,
          price: product.price,
          perMonthText: plan === 'yearly' ? product.pricePerMonthString : null,
          trial: trialOpen.has(product.identifier) ? trialOf(product) : null,
          winBack: winBack?.offer ?? null,
        };
      }
      return { plans };
    },
    purchase: async (productId, winBack) => {
      try {
        await ready();
        await identity.beforeBuying();
        const pkg = packages.get(productId);
        if (!pkg) return { kind: 'failed' };
        const offer = winBack === undefined ? undefined : winBacks.get(winBack);
        const { customerInfo } =
          offer === undefined
            ? await Purchases.purchasePackage(pkg)
            : await Purchases.purchasePackageWithWinBackOffer(pkg, offer);
        return { kind: 'purchased', customer: customerFromStore(customerInfo) };
      } catch (error) {
        if (errorCodeOf(error) === PAYMENT_PENDING) return { kind: 'pending' };
        return cancelledByUser(error) ? { kind: 'cancelled' } : { kind: 'failed' };
      }
    },
    restore: async () => {
      await ready();
      await identity.beforeBuying();
      return customerFromStore(await Purchases.restorePurchases());
    },
    customer: async (fresh) => {
      await ready();
      if (fresh === true) await Purchases.invalidateCustomerInfoCache();
      return customerFromStore(await Purchases.getCustomerInfo());
    },
    manageSubscriptions: async () => {
      await ready();
      await Purchases.showManageSubscriptions();
    },
    onCustomerChange: (listener) => {
      const heard = (info: CustomerInfo) => listener(customerFromStore(info));
      Purchases.addCustomerInfoUpdateListener(heard);
      return () => void Purchases.removeCustomerInfoUpdateListener(heard);
    },
    linked: () => identity.linked(),
  };
}
