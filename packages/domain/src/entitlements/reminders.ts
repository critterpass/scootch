import type { ClockTime } from '../contracts';
import { addDays, instantOfLocal, localDateTime, type Instant } from '../day';

/** A trial's end is announced this many days before it. */
export const TRIAL_REMINDER_DAYS_BEFORE = 1;
/** A yearly renewal is announced this many days before the charge, a monthly one the day before. */
export const YEARLY_REMINDER_DAYS_BEFORE = 3;
export const MONTHLY_REMINDER_DAYS_BEFORE = 1;
/** The reminder goes out at this time on the user's wall clock. */
export const REMINDER_CLOCK: ClockTime = '09:00';

/** What the store reports about a subscription. Every date here is the store's. */
export interface StoreSubscription {
  readonly plan: 'monthly' | 'yearly';
  /** When the free trial ends and the first charge is made; `null` outside a trial. */
  readonly trialEndsAt: Instant | null;
  /** When the next renewal is charged; `null` when there is none. */
  readonly renewsAt: Instant | null;
  /** False once renewal is turned off: nothing will be charged, so nothing is announced. */
  readonly willRenew: boolean;
}

export interface ChargeReminder {
  readonly kind: 'trial_ends' | 'renewal';
  readonly remindAt: Instant;
  /** The store's instant of the charge being announced. */
  readonly chargeAt: Instant;
}

function daysBefore(chargeAt: Instant, days: number, timeZone: string): Instant {
  const chargeDay = localDateTime(chargeAt, timeZone).date;
  return instantOfLocal(addDays(chargeDay, -days), REMINDER_CLOCK, timeZone);
}

/**
 * When to announce the next charge. The answer is built from the store's dates and the zone the
 * user reads a clock in; the current time is not an input, so a phone with a wrong clock schedules
 * the same reminders. The caller drops one whose instant has already gone by.
 */
export function chargeReminders(
  subscription: StoreSubscription,
  timeZone: string,
): readonly ChargeReminder[] {
  if (!subscription.willRenew) return [];
  if (subscription.trialEndsAt !== null) {
    const chargeAt = subscription.trialEndsAt;
    return [
      {
        kind: 'trial_ends',
        remindAt: daysBefore(chargeAt, TRIAL_REMINDER_DAYS_BEFORE, timeZone),
        chargeAt,
      },
    ];
  }
  if (subscription.renewsAt === null) return [];
  const chargeAt = subscription.renewsAt;
  const lead =
    subscription.plan === 'yearly' ? YEARLY_REMINDER_DAYS_BEFORE : MONTHLY_REMINDER_DAYS_BEFORE;
  return [{ kind: 'renewal', remindAt: daysBefore(chargeAt, lead, timeZone), chargeAt }];
}
