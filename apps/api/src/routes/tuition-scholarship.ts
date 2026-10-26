// Every export of a file in this folder is a route; the rules below stay inside it.
import { z } from 'zod';

import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';
import {
  holdsTuition,
  readTuitionRecords,
  tuitionCustomerId,
  writeTuitionRecord,
  type TuitionRecord,
} from '../tuition/records';
import { grantTuition, RevenueCatUnavailable } from '../tuition/revenuecat-api';

/** A scholarship is one free school year. */
const scholarshipDays = 365;

/**
 * A device holding tuition for longer than this is answered with what it holds, and nothing new
 * is granted. Inside it, or once tuition has run out, the scholarship can be asked for again.
 */
const scholarshipAskAgainDays = 30;

const dayMs = 24 * 60 * 60 * 1000;

/** The phone sends nothing with the ask: the note it lets a person write stays on the phone. */
const scholarshipRequestSchema = z.strictObject({});

type ScholarshipResponse = {
  /** When the free year ends, ISO; `null` for tuition that never ends. */
  readonly expiresAt: string | null;
  /** False when the device already held tuition long enough and nothing new was granted. */
  readonly granted: boolean;
};

/**
 * "Can't pay right now?": a free school year of tuition, with no proof, granted through RevenueCat
 * as a promotional entitlement for the device's id there. It can be asked for again; each device
 * is held to one grant until its tuition is within a month of running out, on top of the limit
 * every device route counts against.
 */
export const tuitionScholarshipRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/tuition/scholarship',
  access: 'device',
  handle: async (c) => {
    await readBody(c, scholarshipRequestSchema);
    const now = new Date();
    const appUserId = await tuitionCustomerId(c.var.device.hash);
    const held = (await readTuitionRecords(c.env.DB, [appUserId])).get(appUserId);
    if (held !== undefined && holdsLongEnough(held, now)) {
      return c.json({ expiresAt: held.expiresAt, granted: false } satisfies ScholarshipResponse);
    }

    const expiresAt = new Date(now.getTime() + scholarshipDays * dayMs);
    try {
      await grantTuition(c.env, appUserId, expiresAt);
    } catch (error) {
      if (error instanceof RevenueCatUnavailable) {
        throw new ApiError('internal', 'The scholarship could not be granted just now');
      }
      throw error;
    }
    const record: TuitionRecord = {
      appUserId,
      active: true,
      expiresAt: expiresAt.toISOString(),
      productId: null,
      storeEnvironment: null,
      source: 'api',
      lastEventId: null,
      eventAt: now.toISOString(),
    };
    // RevenueCat's own event for the grant replaces this when the webhook hears it.
    await writeTuitionRecord(c.env.DB, record, now).run();
    return c.json({ expiresAt: record.expiresAt, granted: true } satisfies ScholarshipResponse);
  },
};

function holdsLongEnough(record: TuitionRecord, now: Date): boolean {
  if (!holdsTuition(record, now)) return false;
  if (record.expiresAt === null) return true;
  return Date.parse(record.expiresAt) - now.getTime() > scholarshipAskAgainDays * dayMs;
}
