/** The three ways to hold Plus. */
export const PLANS = ['monthly', 'yearly', 'lifetime'] as const;
export type PlanId = (typeof PLANS)[number];

/** The product identifiers as they are created in App Store Connect. */
export const PLAN_PRODUCTS: Readonly<Record<PlanId, string>> = {
  monthly: 'plus_monthly',
  yearly: 'plus_yearly',
  lifetime: 'plus_lifetime',
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
