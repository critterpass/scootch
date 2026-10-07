import { FREE_STARTS_PER_DAY } from '@scootch/domain';

import type { Translate } from '../../i18n/i18n-provider';

import type { CustomerState } from './purchases-port';

/**
 * What the plan does next, said plainly: when the trial ends, when it renews, when it stops, or
 * that it never renews. `date` is the store's next date for the plan, already written out; with
 * none, a subscription says nothing rather than guess.
 */
export function planLine(customer: CustomerState, date: string | null, t: Translate): string {
  const plan = customer.activePlan;
  if (plan === 'lifetime') return t('plus.manage.lifetime');
  if (plan === null) return t('plus.manage.free.note', { count: FREE_STARTS_PER_DAY });
  if (date === null) return '';
  if (customer.inTrial && customer.willRenew) return t('plus.manage.trialEnds', { date });
  if (!customer.willRenew) return t('plus.manage.ends', { date });
  return t(`plus.manage.renews.${plan}`, { date });
}

/** The store's next date for the plan: the trial's end, the renewal, or the day it stops. */
export function nextPlanDate(customer: CustomerState): number | null {
  return customer.inTrial ? customer.trialEndsAt : (customer.renewsAt ?? customer.endsAt);
}
