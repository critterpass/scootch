import { z } from 'zod';

import {
  holdsTuition,
  isoAfter,
  TUITION_ENTITLEMENT,
  readTuitionRecords,
  storeTimeSchema,
  writeTuitionRecord,
  type TuitionRecord,
} from './records';

/** An event id is remembered this long, far past the last time RevenueCat would send it again. */
const eventsRememberedMs = 30 * 24 * 60 * 60 * 1000;

/** At most this many ids a single event writes to: the customer, the original and its aliases. */
const maxIdsPerEvent = 20;

const appUserIdSchema = z.string().min(1).max(200);

/** The parts of a RevenueCat webhook event this reads. Everything else it carries is dropped. */
const eventSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(64),
  event_timestamp_ms: storeTimeSchema,
  app_user_id: appUserIdSchema.nullish(),
  original_app_user_id: appUserIdSchema.nullish(),
  aliases: z.array(appUserIdSchema).nullish(),
  entitlement_ids: z.array(z.string()).nullish(),
  entitlement_id: z.string().nullish(),
  product_id: z.string().max(200).nullish(),
  expiration_at_ms: storeTimeSchema.nullish(),
  grace_period_expiration_at_ms: storeTimeSchema.nullish(),
  environment: z.enum(['SANDBOX', 'PRODUCTION']).nullish(),
  cancel_reason: z.string().nullish(),
  transferred_from: z.array(appUserIdSchema).nullish(),
  transferred_to: z.array(appUserIdSchema).nullish(),
});
export type RevenueCatEvent = z.infer<typeof eventSchema>;

/** A webhook delivery's body: one event under `event`. */
export const deliverySchema = z.object({ event: eventSchema });

/** Events after which the customer pays tuition until the event's expiry, or for good when none. */
const granting = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  // A one-off purchase that grants tuition, with no expiry.
  'NON_RENEWING_PURCHASE',
  'REFUND_REVERSED',
]);

/** A tuition plan's product, in either environment's spelling, for an event that names no entitlement. */
const tuitionProduct = /^phusclass\.(?:dev\.)?tuition\.(?:monthly|yearly)$/;

function aboutTuition(event: RevenueCatEvent): boolean {
  if (event.entitlement_ids != null) return event.entitlement_ids.includes(TUITION_ENTITLEMENT);
  if (event.entitlement_id != null) return event.entitlement_id === TUITION_ENTITLEMENT;
  return event.product_id != null && tuitionProduct.test(event.product_id);
}

const iso = (ms: number | null | undefined) => (ms == null ? null : new Date(ms).toISOString());

/** The later of two expiries, where null is a purchase that never ends. */
function later(a: string | null, b: string | null): string | null {
  if (a === null || b === null) return null;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function customerIds(event: RevenueCatEvent): string[] {
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))].slice(
    0,
    maxIdsPerEvent,
  );
}

/** The records an event leaves behind, given what was known before it. */
function recordsAfter(
  event: RevenueCatEvent,
  known: ReadonlyMap<string, TuitionRecord>,
  now: Date,
): TuitionRecord[] {
  const eventAt = new Date(event.event_timestamp_ms).toISOString();
  const stamp = {
    source: 'webhook' as const,
    lastEventId: event.id,
    eventAt,
  };

  if (event.type === 'TRANSFER') {
    // Everything the old ids held moves to the new ones; the old ones keep nothing.
    const from = (event.transferred_from ?? []).slice(0, maxIdsPerEvent);
    const to = (event.transferred_to ?? []).slice(0, maxIdsPerEvent);
    const held = from
      .map((id) => known.get(id))
      .filter((record): record is TuitionRecord => record !== undefined)
      .sort((a, b) => Number(holdsTuition(b, now)) - Number(holdsTuition(a, now)))[0];
    const emptied = from.flatMap((appUserId): TuitionRecord[] => {
      const before = known.get(appUserId);
      return before === undefined || to.includes(appUserId)
        ? []
        : [{ ...before, active: false, ...stamp }];
    });
    const filled =
      held === undefined ? [] : to.map((appUserId) => ({ ...held, appUserId, ...stamp }));
    return [...emptied, ...filled];
  }

  if (!aboutTuition(event)) return [];
  const expiry = iso(event.expiration_at_ms);
  const storeEnvironment =
    event.environment == null ? null : event.environment === 'SANDBOX' ? 'sandbox' : 'production';

  return customerIds(event).flatMap((appUserId): TuitionRecord[] => {
    const before = known.get(appUserId);
    const base = {
      appUserId,
      productId: event.product_id ?? before?.productId ?? null,
      storeEnvironment: storeEnvironment ?? before?.storeEnvironment ?? null,
      ...stamp,
    };
    if (granting.has(event.type)) return [{ ...base, active: true, expiresAt: expiry }];
    // The paid time already known, never cut short by an event that does not end it.
    const kept = before?.active ? later(before.expiresAt, expiry) : expiry;
    switch (event.type) {
      case 'CANCELLATION':
        // A refund takes tuition away at once. Any other cancellation only stops the renewal: tuition
        // holds until the paid time runs out.
        if (event.cancel_reason === 'CUSTOMER_SUPPORT') {
          return [{ ...base, active: false, expiresAt: expiry }];
        }
        return [{ ...base, active: true, expiresAt: kept }];
      case 'BILLING_ISSUE':
        // A failed charge is not an expiry: tuition holds through the store's grace period, and ends
        // with the EXPIRATION that follows if the charge never succeeds.
        return [
          {
            ...base,
            active: true,
            expiresAt: later(kept, iso(event.grace_period_expiration_at_ms) ?? kept),
          },
        ];
      case 'EXPIRATION':
        return [{ ...base, active: false, expiresAt: expiry }];
      default:
        return [];
    }
  });
}

/**
 * Takes in one webhook event: once, however often it is delivered. Answers whether it was new.
 * The event's id is kept in the same batch as the records it changes, so a delivery that lands
 * twice at the same moment changes them once.
 */
export async function takeInEvent(
  db: D1Database,
  event: RevenueCatEvent,
  now: Date,
): Promise<'taken' | 'seen'> {
  const seen = await db
    .prepare('SELECT 1 FROM revenuecat_events WHERE id = ?')
    .bind(event.id)
    .first();
  if (seen !== null) return 'seen';

  const ids =
    event.type === 'TRANSFER'
      ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].slice(
          0,
          maxIdsPerEvent * 2,
        )
      : customerIds(event);
  const records = recordsAfter(event, await readTuitionRecords(db, ids), now);
  try {
    await db.batch([
      db
        .prepare('INSERT INTO revenuecat_events (id, type, received_at) VALUES (?, ?, ?)')
        .bind(event.id, event.type, now.toISOString()),
      ...records.map((record) => writeTuitionRecord(db, record, now)),
      db
        .prepare('DELETE FROM revenuecat_events WHERE received_at < ?')
        .bind(isoAfter(now, -eventsRememberedMs)),
    ]);
  } catch (error) {
    // The same event, taken in by a delivery that arrived alongside this one.
    const again = await db
      .prepare('SELECT 1 FROM revenuecat_events WHERE id = ?')
      .bind(event.id)
      .first();
    if (again !== null) return 'seen';
    throw error;
  }
  return 'taken';
}
