import type { NoTaskSlot } from '@scootch/voice';

import type { Translate } from '../../i18n/i18n-provider';

import type { PlanOffer } from './purchases-port';

/** Why the sheet was opened. It changes Scootch's one line and nothing else. */
export type SheetReason = 'asked' | 'one_more';

export function sheetLineSlot(reason: SheetReason): NoTaskSlot {
  return reason === 'one_more' ? 'plusOneMore' : 'plusSheet';
}

/** Whether the store offers this Apple ID a free trial on the plan. */
export function hasTrial(offer: PlanOffer): offer is PlanOffer & { trialDays: number } {
  return offer.plan === 'yearly' && offer.trialDays !== null && offer.trialDays > 0;
}

/**
 * The label of the sheet's one action. It promises a trial only when the store offers one, and
 * every price in it is the store's own text.
 */
export function actionLabel(offer: PlanOffer, t: Translate): string {
  if (hasTrial(offer)) return t('plus.action.trial', { count: offer.trialDays });
  if (offer.plan === 'lifetime') return t('plus.action.lifetime', { price: offer.priceText });
  return t(`plus.action.${offer.plan}`, { price: offer.priceText });
}

/** The small print: exactly what is charged, when it renews and how to cancel. */
export function smallPrint(offer: PlanOffer, t: Translate): string {
  if (hasTrial(offer)) {
    return t('plus.print.trial', { count: offer.trialDays, price: offer.priceText });
  }
  return t(`plus.print.${offer.plan}`, { price: offer.priceText });
}

/** The line under a plan's price on its tile. */
export function planNote(offer: PlanOffer, t: Translate): string {
  if (hasTrial(offer)) return t('plus.plan.yearly.trialNote', { count: offer.trialDays });
  return t(`plus.plan.${offer.plan}.note`);
}
