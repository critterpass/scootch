import Constants from 'expo-constants';

/** The two ways to pay tuition. The school year is offered first. */
export const PLANS = ['yearly', 'monthly'] as const;
export type PlanId = (typeof PLANS)[number];

/**
 * A plan's product identifier as it is created in App Store Connect. Apple keeps identifiers
 * unique across the whole developer account, so the dev app's carry `dev` in theirs.
 */
export function storeProductId(plan: PlanId, variant: unknown = appVariant()): string {
  return variant === 'prd' ? `phusclass.tuition.${plan}` : `phusclass.dev.tuition.${plan}`;
}

function appVariant(): unknown {
  return Constants.expoConfig?.extra?.['appVariant'];
}

export const PLAN_PRODUCTS: Readonly<Record<PlanId, string>> = {
  yearly: storeProductId('yearly'),
  monthly: storeProductId('monthly'),
};

/** The one entitlement both plans grant. */
export const TUITION_ENTITLEMENT = 'tuition';

/** The plan the receipt opens on. */
export const PRESELECTED_PLAN: PlanId = 'yearly';

/** The pages the receipt always links to, in the language the receipt is read in. */
export function legalLink(page: 'terms' | 'privacy', language: 'en' | 'vi'): string {
  return language === 'vi' ? `https://phusclass.com/vi/${page}` : `https://phusclass.com/${page}`;
}

/** RevenueCat's packages in the `default` offering, by plan. */
export const PLAN_PACKAGES: Readonly<Record<PlanId, string>> = {
  yearly: '$rc_annual',
  monthly: '$rc_monthly',
};

export function planOfProduct(productId: string): PlanId | null {
  return PLANS.find((plan) => PLAN_PRODUCTS[plan] === productId) ?? null;
}
