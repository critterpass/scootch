import type { Instant, IsoDate } from '@phusclass/domain';

import type { PlanId } from './products';
import type { CustomerState, FreeOffer, Offerings, PlanOffer } from './purchases-port';
import { isEnrolled } from './revenuecat-customer';
import { chargeDaysAt, chargeDaysFor } from './tuition-dates';

/**
 * Where the receipt stands. `offer` is unstamped; `trial` carries the FREE WEEK stamp, `paid` the
 * PAID stamp; `pending` waits on Ask to Buy; `failed` charged nothing. `scholarship` is tuition
 * held through a scholarship.
 */
export type ReceiptStage = 'offer' | 'trial' | 'paid' | 'pending' | 'failed' | 'scholarship';

/** The stage a receipt opens on, from what the store says. */
export function stageOf(customer: CustomerState): ReceiptStage {
  if (customer.scholarship) return 'scholarship';
  if (customer.activePlan === null) return 'offer';
  return customer.inTrial ? 'trial' : 'paid';
}

/** One line of the card under the receipt, by what it says, with the day it is about. */
export type ReceiptStep =
  | { readonly kind: 'opensFree'; readonly day: IsoDate }
  | { readonly kind: 'opensPaid'; readonly day: IsoDate }
  | { readonly kind: 'note'; readonly day: IsoDate }
  | { readonly kind: 'firstCharge'; readonly day: IsoDate; readonly price: string }
  | { readonly kind: 'renews'; readonly day: IsoDate; readonly price: string }
  | { readonly kind: 'ends'; readonly day: IsoDate }
  | { readonly kind: 'scholarship'; readonly day: IsoDate }
  | { readonly kind: 'scholarshipEnds'; readonly day: IsoDate }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'notPaid' };

/** The free stretch this plan starts with for this Apple ID: the win-back month, or the trial. */
export function freeStretchOf(offer: PlanOffer | undefined): FreeOffer | null {
  return offer?.winBack ?? offer?.trial ?? null;
}

export interface StepsInput {
  readonly stage: ReceiptStage;
  readonly plan: PlanId;
  readonly offerings: Offerings | null;
  readonly customer: CustomerState;
  readonly now: Instant;
  readonly timeZone: string;
}

const day = (now: Instant, timeZone: string) => chargeDaysAt(now, now, timeZone).today;

/**
 * The card's lines, every date from the store: before the button, today, the day of his note and
 * the day of the first charge, from the real free stretch on offer; after it, the store's own
 * dates for the trial's end or the renewal. A plan whose price is not known yet shows no charge.
 */
export function receiptSteps(input: StepsInput): ReceiptStep[] {
  const { now, timeZone, customer } = input;
  const offer = input.offerings?.plans[input.plan];
  const price = offer?.priceText;
  switch (input.stage) {
    case 'pending':
      return [{ kind: 'waiting' }];
    case 'failed':
      return [{ kind: 'notPaid' }];
    case 'scholarship':
      return [
        { kind: 'scholarship', day: day(now, timeZone) },
        ...(customer.scholarshipEndsAt === null
          ? []
          : [{ kind: 'scholarshipEnds' as const, day: day(customer.scholarshipEndsAt, timeZone) }]),
      ];
    case 'offer': {
      const free = freeStretchOf(offer);
      if (offer === undefined || price === undefined) return [];
      if (free === null) {
        // Paid from today: the first renewal is a whole plan away.
        const days = chargeDaysFor(
          now,
          { unit: input.plan === 'yearly' ? 'YEAR' : 'MONTH', count: 1 },
          timeZone,
        );
        return [
          { kind: 'opensPaid', day: days.today },
          { kind: 'note', day: days.note },
          { kind: 'renews', day: days.charge, price },
        ];
      }
      const days = chargeDaysFor(now, free.period, timeZone);
      return [
        { kind: 'opensFree', day: days.today },
        { kind: 'note', day: days.note },
        { kind: 'firstCharge', day: days.charge, price },
      ];
    }
    case 'trial': {
      const chargeAt = customer.trialEndsAt;
      if (chargeAt === null) return [{ kind: 'opensFree', day: day(now, timeZone) }];
      const days = chargeDaysAt(now, chargeAt, timeZone);
      if (!customer.willRenew) {
        return [
          { kind: 'opensFree', day: days.today },
          { kind: 'ends', day: days.charge },
        ];
      }
      return [
        { kind: 'opensFree', day: days.today },
        { kind: 'note', day: days.note },
        ...(price === undefined ? [] : [{ kind: 'firstCharge' as const, day: days.charge, price }]),
      ];
    }
    case 'paid': {
      const today = day(now, timeZone);
      if (customer.renewsAt !== null && customer.willRenew) {
        const days = chargeDaysAt(now, customer.renewsAt, timeZone);
        return [
          { kind: 'opensPaid', day: today },
          { kind: 'note', day: days.note },
          ...(price === undefined ? [] : [{ kind: 'renews' as const, day: days.charge, price }]),
        ];
      }
      return [
        { kind: 'opensPaid', day: today },
        ...(customer.endsAt === null
          ? []
          : [{ kind: 'ends' as const, day: day(customer.endsAt, timeZone) }]),
      ];
    }
  }
}

/** How much less the school year costs than twelve months, in whole percent; `null` if unknown. */
export function yearSaving(offerings: Offerings | null): number | null {
  const year = offerings?.plans.yearly?.price;
  const month = offerings?.plans.monthly?.price;
  if (year === undefined || month === undefined || month <= 0) return null;
  const saving = Math.floor((1 - year / (month * 12)) * 100);
  return saving > 0 ? saving : null;
}

/** The plan the receipt shows as chosen once tuition is held: the one paying it. */
export function shownPlan(customer: CustomerState, picked: PlanId): PlanId {
  return isEnrolled(customer) && customer.activePlan !== null ? customer.activePlan : picked;
}
