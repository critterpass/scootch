import type { Bindings } from '../env';

import { askRevenueCat } from './revenuecat-api';
import { holdsPlus, plusCustomerId, readPlusRecords, writePlusRecord } from './records';

/**
 * How long the API's "no Plus" is believed before it is asked again. A phone that bought before it
 * logged in to RevenueCat with its server id has its purchase moved over with no event the
 * webhook hears, so a "no" from the API is not the last word the way the webhook's is.
 */
export const apiNoPlusBelievedMs = 60 * 60 * 1000;

/**
 * Whether the device holds Plus right now, by the server's own record and never by the phone's
 * word. The record is the store's events through the webhook. With no record yet, RevenueCat's API
 * is asked once, when it is set up, and its answer kept; without an answer, the device does not
 * hold Plus.
 */
export async function isPlusNow(
  env: Bindings,
  deviceHash: string,
  now: Date = new Date(),
): Promise<boolean> {
  const appUserId = await plusCustomerId(deviceHash);
  const record = (await readPlusRecords(env.DB, [appUserId])).get(appUserId);
  const askAgain =
    record === undefined ||
    (record.source === 'api' &&
      !holdsPlus(record, now) &&
      now.getTime() - Date.parse(record.eventAt) >= apiNoPlusBelievedMs);
  if (record !== undefined && !askAgain) return holdsPlus(record, now);

  const answer = await askRevenueCat(env, appUserId, now);
  if (answer === undefined) return record !== undefined && holdsPlus(record, now);
  await writePlusRecord(env.DB, answer, now).run();
  return holdsPlus(answer, now);
}
