import type { Bindings } from '../env';

import { askRevenueCat } from './revenuecat-api';
import { holdsTuition, tuitionCustomerId, readTuitionRecords, writeTuitionRecord } from './records';

/**
 * How long the API's "no tuition" is believed before it is asked again. A phone that bought before it
 * logged in to RevenueCat with its server id has its purchase moved over with no event the
 * webhook hears, so a "no" from the API is not the last word the way the webhook's is.
 */
export const apiNoTuitionBelievedMs = 60 * 60 * 1000;

/**
 * Whether the device pays tuition right now, by the server's own record and never by the phone's
 * word. The record is the store's events through the webhook. With no record yet, RevenueCat's API
 * is asked once, when it is set up, and its answer kept; without an answer, the device does not
 * pay tuition.
 */
export async function isTuitionNow(
  env: Bindings,
  deviceHash: string,
  now: Date = new Date(),
): Promise<boolean> {
  const appUserId = await tuitionCustomerId(deviceHash);
  const record = (await readTuitionRecords(env.DB, [appUserId])).get(appUserId);
  const askAgain =
    record === undefined ||
    (record.source === 'api' &&
      !holdsTuition(record, now) &&
      now.getTime() - Date.parse(record.eventAt) >= apiNoTuitionBelievedMs);
  if (record !== undefined && !askAgain) return holdsTuition(record, now);

  const answer = await askRevenueCat(env, appUserId, now);
  if (answer === undefined) return record !== undefined && holdsTuition(record, now);
  await writeTuitionRecord(env.DB, answer, now).run();
  return holdsTuition(answer, now);
}
