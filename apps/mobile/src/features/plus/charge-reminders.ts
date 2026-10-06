import {
  chargeReminders,
  type Attitude,
  type Instant,
  type IsoDate,
  localDateTime,
} from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { noTaskLine, renewalLine } from '@scootch/voice';

import type { LocalNotification, NotificationScheduler } from '../../effects/adapters';

import { subscriptionOf } from './entitlement';
import type { PlanId } from './products';
import type { CustomerState } from './purchases-port';

/** Every charge reminder's id starts with this, so they are told apart from the day's nudges. */
export const CHARGE_REMINDER_PREFIX = 'plus-charge-';

export interface ChargeReminderInput {
  readonly customer: CustomerState;
  readonly timeZone: string;
  readonly language: Language;
  readonly attitude: Attitude;
  /** The store's own price text for each plan, where it is known. */
  readonly prices: Readonly<Partial<Record<PlanId, string>>>;
}

/** The day of a store instant, as the person would say it: its weekday in their zone. */
export function weekdayOf(instant: Instant, language: Language, timeZone: string): string {
  return new Intl.DateTimeFormat(language, { weekday: 'long', timeZone }).format(instant);
}

/**
 * The local notifications that announce the next charge. When they go out comes from the store's
 * dates through the domain's reminder rules; the phone's clock is not an input. The id carries the
 * charge it announces, so a new date from the store is a new reminder.
 */
export function plannedChargeReminders(input: ChargeReminderInput): LocalNotification[] {
  const subscription = subscriptionOf(input.customer);
  if (subscription === null) return [];
  return chargeReminders(subscription, input.timeZone).map((reminder) => ({
    id: `${CHARGE_REMINDER_PREFIX}${reminder.kind}-${reminder.chargeAt}`,
    at: reminder.remindAt,
    text:
      reminder.kind === 'trial_ends'
        ? noTaskLine(input.language, input.attitude, 'trialEndsTomorrow')
        : renewalLine(
            input.language,
            input.attitude,
            subscription.plan,
            weekdayOf(reminder.chargeAt, input.language, input.timeZone),
            input.prices[subscription.plan] ?? null,
          ),
  }));
}

/**
 * Makes the scheduled charge reminders match the plan: every older one is cancelled and the ones
 * still to come are scheduled. `now` only drops a reminder whose time has already gone by.
 */
export async function syncChargeReminders(
  scheduler: NotificationScheduler,
  planned: readonly LocalNotification[],
  now: Instant,
): Promise<void> {
  for (const id of await scheduler.scheduledIds()) {
    if (id.startsWith(CHARGE_REMINDER_PREFIX)) await scheduler.cancel(id);
  }
  for (const reminder of planned) {
    if (reminder.at > now) await scheduler.schedule(reminder);
  }
}

/** What the trial's dates mean on a given local day. */
export type TrialDay = 'day_before' | 'last_day' | null;

/**
 * Whether `today` is the day before the trial's charge or the day of it, in the person's zone.
 * Nothing is said about a trial whose renewal is off: nothing will be charged.
 */
export function trialDayOf(customer: CustomerState, today: IsoDate, timeZone: string): TrialDay {
  const subscription = subscriptionOf(customer);
  if (!subscription || subscription.trialEndsAt === null || !subscription.willRenew) return null;
  const [reminder] = chargeReminders(subscription, timeZone);
  if (!reminder) return null;
  if (localDateTime(reminder.remindAt, timeZone).date === today) return 'day_before';
  return localDateTime(reminder.chargeAt, timeZone).date === today ? 'last_day' : null;
}
