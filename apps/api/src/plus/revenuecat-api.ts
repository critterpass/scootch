import { z } from 'zod';

import type { Bindings } from '../env';

import { PLUS_ENTITLEMENT, storeTimeSchema, type PlusRecord } from './records';

export const revenueCatApiBase = 'https://api.revenuecat.com/v2';

const fetchTimeoutMs = 5000;

/** The parts of API v2's customer this reads: its active entitlements, by RevenueCat's own id. */
const customerSchema = z.object({
  active_entitlements: z.object({
    items: z.array(
      z.object({ entitlement_id: z.string(), expires_at: storeTimeSchema.nullable() }),
    ),
  }),
});

/** The project's entitlements, to find which of RevenueCat's ids is Plus's lookup key. */
const entitlementsSchema = z.object({
  items: z.array(z.object({ id: z.string(), lookup_key: z.string() })),
});

/** Plus's entitlement id at RevenueCat, per project, kept for the life of the isolate. */
const plusEntitlementIds = new Map<string, string>();

class RevenueCatUnavailable extends Error {}

async function getJson(env: Bindings, path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${revenueCatApiBase}${path}`, {
      headers: { Authorization: `Bearer ${env.REVENUECAT_API_V2_KEY ?? ''}` },
      signal: AbortSignal.timeout(fetchTimeoutMs),
    });
  } catch {
    throw new RevenueCatUnavailable();
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new RevenueCatUnavailable();
  return response.json().catch(() => {
    throw new RevenueCatUnavailable();
  });
}

async function plusEntitlementId(env: Bindings, projectId: string): Promise<string | undefined> {
  const kept = plusEntitlementIds.get(projectId);
  if (kept !== undefined) return kept;
  const parsed = entitlementsSchema.safeParse(
    await getJson(env, `/projects/${encodeURIComponent(projectId)}/entitlements?limit=100`),
  );
  if (!parsed.success) throw new RevenueCatUnavailable();
  const id = parsed.data.items.find((item) => item.lookup_key === PLUS_ENTITLEMENT)?.id;
  if (id !== undefined) plusEntitlementIds.set(projectId, id);
  return id;
}

/**
 * Asks RevenueCat whether a customer holds Plus right now. Undefined when the API is not set up
 * for this environment or did not give a usable answer, so nothing is kept from it; a customer
 * RevenueCat has never seen holds nothing.
 */
export async function askRevenueCat(
  env: Bindings,
  appUserId: string,
  now: Date,
): Promise<PlusRecord | undefined> {
  const projectId = env.REVENUECAT_PROJECT_ID;
  if (!env.REVENUECAT_API_V2_KEY || !projectId) return undefined;
  const answer = (active: boolean, expiresAt: string | null): PlusRecord => ({
    appUserId,
    active,
    expiresAt,
    productId: null,
    storeEnvironment: null,
    source: 'api',
    lastEventId: null,
    eventAt: now.toISOString(),
  });
  try {
    const json = await getJson(
      env,
      `/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}`,
    );
    if (json === null) return answer(false, null);
    const parsed = customerSchema.safeParse(json);
    if (!parsed.success) return undefined;
    const items = parsed.data.active_entitlements.items;
    if (items.length === 0) return answer(false, null);
    const plusId = await plusEntitlementId(env, projectId);
    const plus = items.find((item) => item.entitlement_id === plusId);
    if (plus === undefined) return answer(false, null);
    return answer(true, plus.expires_at === null ? null : new Date(plus.expires_at).toISOString());
  } catch (error) {
    if (error instanceof RevenueCatUnavailable) return undefined;
    throw error;
  }
}
