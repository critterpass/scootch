import Constants from 'expo-constants';

/** The three ways to hold Plus. */
export const PLANS = ['monthly', 'yearly', 'lifetime'] as const;
export type PlanId = (typeof PLANS)[number];

/**
 * A product's identifier as it is created in App Store Connect. Apple keeps identifiers unique
 * across the whole developer account, so the production app's carry a prefix and the dev app's
 * do not.
 */
export function storeProductId(id: string, variant: unknown = appVariant()): string {
  return variant === 'prd' ? `scootch_${id}` : id;
}

function appVariant(): unknown {
  return Constants.expoConfig?.extra?.['appVariant'];
}

export const PLAN_PRODUCTS: Readonly<Record<PlanId, string>> = {
  monthly: storeProductId('plus_monthly'),
  yearly: storeProductId('plus_yearly'),
  lifetime: storeProductId('plus_lifetime'),
};

/** The one entitlement every plan grants. */
export const PLUS_ENTITLEMENT = 'plus';

/** The plan the sheet opens on. */
export const PRESELECTED_PLAN: PlanId = 'yearly';

/** The pages the sheet always links to. */
export const LEGAL_LINKS = {
  terms: 'https://scootch.app/terms',
  privacy: 'https://scootch.app/privacy',
} as const;

export function planOfProduct(productId: string): PlanId | null {
  return PLANS.find((plan) => PLAN_PRODUCTS[plan] === productId) ?? null;
}
