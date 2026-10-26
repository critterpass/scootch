import { localDateTime, type Instant } from '@phusclass/domain';
import { chooseIndex, fillLine, linePacks, type ClassLanguage } from '@phusclass/voice/class';

import type { LocalNotification, NotificationScheduler } from '../../effects/adapters';

import type { PlanId } from './products';
import type { CustomerState } from './purchases-port';
import { nextChargeAt } from './revenuecat-customer';
import { noteBeforeCharge, noteDay } from './tuition-dates';

/** Every charge note's id starts with this, so it is told apart from his notes home. */
export const CHARGE_NOTE_PREFIX = 'tuition-charge-';

export interface ChargeNoteInput {
  readonly customer: CustomerState;
  readonly now: Instant;
  readonly timeZone: string;
  readonly language: ClassLanguage;
  /** The store's own price text for each plan, where it is known. */
  readonly prices: Readonly<Partial<Record<PlanId, string>>>;
}

/**
 * His note before the next charge, two days ahead of it, in his own words from the voice pack.
 * Built from the store's date for the charge; the phone's clock only drops a note whose time has
 * gone by. Nothing is planned when nothing will be charged (a scholarship, renewal turned off),
 * or when the price is not known, so a note never names a wrong amount. The id carries the
 * charge, so a new date from the store is a new note.
 */
export function plannedChargeNote(input: ChargeNoteInput): LocalNotification | null {
  const chargeAt = nextChargeAt(input.customer);
  const plan = input.customer.activePlan;
  if (chargeAt === null || plan === null) return null;
  const price = input.prices[plan];
  if (price === undefined) return null;
  const at = noteBeforeCharge(chargeAt, input.timeZone);
  if (at <= input.now) return null;
  const variants = linePacks[input.language].tuitionChargeReminder;
  const line = variants[chooseIndex(variants.length, 'tuitionChargeReminder', chargeAt)] ?? '';
  const day = localDateTime(chargeAt, input.timeZone).date;
  return {
    id: `${CHARGE_NOTE_PREFIX}${chargeAt}`,
    at,
    text: fillLine(line, { date: noteDay(day, input.language), price }),
  };
}

/** Makes the scheduled charge note match the plan: older ones go, the planned one is set. */
export async function syncChargeNote(
  scheduler: NotificationScheduler,
  planned: LocalNotification | null,
): Promise<void> {
  for (const id of await scheduler.scheduledIds()) {
    if (id.startsWith(CHARGE_NOTE_PREFIX) && id !== planned?.id) await scheduler.cancel(id);
  }
  if (planned !== null) await scheduler.schedule(planned);
}
