import { z } from 'zod';

import { hashDeviceToken } from '../device-auth';

/** The one RevenueCat entitlement every tuition plan grants, by its lookup key. */
export const TUITION_ENTITLEMENT = 'tuition';

/**
 * A device's id at RevenueCat. Derived from the device's token hash under its own purpose, so the
 * hash the server recognises a device by never leaves the server, and the same device always
 * gets the same id.
 */
export function tuitionCustomerId(deviceHash: string): Promise<string> {
  return hashDeviceToken(`tuition-customer:${deviceHash}`);
}

export const isoAfter = (now: Date, ms: number) => new Date(now.getTime() + ms).toISOString();

/** A time RevenueCat sends, in milliseconds, that reads back as a four-digit-year ISO time. */
export const storeTimeSchema = z.number().int().min(0).max(253_402_300_799_999);

/** What the server knows about one RevenueCat customer's tuition. */
export type TuitionRecord = {
  readonly appUserId: string;
  readonly active: boolean;
  /** ISO time; null for a purchase that never ends. */
  readonly expiresAt: string | null;
  readonly productId: string | null;
  readonly storeEnvironment: 'sandbox' | 'production' | null;
  /** The webhook is the store's word; an answer from the API stands in until it speaks. */
  readonly source: 'webhook' | 'api';
  readonly lastEventId: string | null;
  /** When the newest event behind the record happened, or when the API was asked. */
  readonly eventAt: string;
};

type Row = {
  app_user_id: string;
  active: number;
  expires_at: string | null;
  product_id: string | null;
  store_environment: 'sandbox' | 'production' | null;
  source: 'webhook' | 'api';
  last_event_id: string | null;
  event_at: string;
};

/** Whether a record pays tuition at this moment. */
export function holdsTuition(record: TuitionRecord, now: Date): boolean {
  return (
    record.active && (record.expiresAt === null || Date.parse(record.expiresAt) > now.getTime())
  );
}

export async function readTuitionRecords(
  db: D1Database,
  appUserIds: readonly string[],
): Promise<Map<string, TuitionRecord>> {
  const found = new Map<string, TuitionRecord>();
  if (appUserIds.length === 0) return found;
  const { results } = await db
    .prepare(
      `SELECT app_user_id, active, expires_at, product_id, store_environment, source,
              last_event_id, event_at
       FROM tuition_entitlements WHERE app_user_id IN (${appUserIds.map(() => '?').join(', ')})`,
    )
    .bind(...appUserIds)
    .all<Row>();
  for (const row of results) {
    found.set(row.app_user_id, {
      appUserId: row.app_user_id,
      active: row.active === 1,
      expiresAt: row.expires_at,
      productId: row.product_id,
      storeEnvironment: row.store_environment,
      source: row.source,
      lastEventId: row.last_event_id,
      eventAt: row.event_at,
    });
  }
  return found;
}

/**
 * Keeps a record, unless what is kept already is newer. A webhook event replaces an answer from
 * the API whenever it comes, and another event only when it happened no earlier; an answer from
 * the API replaces only an earlier answer from the API, never the webhook's word.
 */
export function writeTuitionRecord(
  db: D1Database,
  record: TuitionRecord,
  now: Date,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO tuition_entitlements (app_user_id, active, expires_at, product_id,
         store_environment, source, last_event_id, event_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (app_user_id) DO UPDATE SET
         active = excluded.active,
         expires_at = excluded.expires_at,
         product_id = excluded.product_id,
         store_environment = excluded.store_environment,
         source = excluded.source,
         last_event_id = excluded.last_event_id,
         event_at = excluded.event_at,
         updated_at = excluded.updated_at
       WHERE tuition_entitlements.source = 'api'
          OR (excluded.source = 'webhook' AND excluded.event_at >= tuition_entitlements.event_at)`,
    )
    .bind(
      record.appUserId,
      record.active ? 1 : 0,
      record.expiresAt,
      record.productId,
      record.storeEnvironment,
      record.source,
      record.lastEventId,
      record.eventAt,
      now.toISOString(),
    );
}
