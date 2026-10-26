import { z } from 'zod';

import type { Bindings } from '../env';

import { TUITION_ENTITLEMENT, storeTimeSchema, type TuitionRecord } from './records';

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

/** The project's entitlements, to find which of RevenueCat's ids is tuition's lookup key. */
const entitlementsSchema = z.object({
  items: z.array(z.object({ id: z.string(), lookup_key: z.string() })),
});

/** The tuition entitlement id at RevenueCat, per project, kept for the life of the isolate. */
const tuitionEntitlementIds = new Map<string, string>();

/** RevenueCat could not be reached, or did not answer in a shape this reads. */
export class RevenueCatUnavailable extends Error {}

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

/** RevenueCat's own id for the tuition entitlement in a project; undefined when it has none. */
export async function tuitionEntitlementId(
  env: Bindings,
  projectId: string,
): Promise<string | undefined> {
  const kept = tuitionEntitlementIds.get(projectId);
  if (kept !== undefined) return kept;
  const parsed = entitlementsSchema.safeParse(
    await getJson(env, `/projects/${encodeURIComponent(projectId)}/entitlements?limit=100`),
  );
  if (!parsed.success) throw new RevenueCatUnavailable();
  const id = parsed.data.items.find((item) => item.lookup_key === TUITION_ENTITLEMENT)?.id;
  if (id !== undefined) tuitionEntitlementIds.set(projectId, id);
  return id;
}

/**
 * Asks RevenueCat whether a customer pays tuition right now. Undefined when the API is not set up
 * for this environment or did not give a usable answer, so nothing is kept from it; a customer
 * RevenueCat has never seen holds nothing.
 */
export async function askRevenueCat(
  env: Bindings,
  appUserId: string,
  now: Date,
): Promise<TuitionRecord | undefined> {
  const projectId = env.REVENUECAT_PROJECT_ID;
  if (!env.REVENUECAT_API_V2_KEY || !projectId) return undefined;
  const answer = (active: boolean, expiresAt: string | null): TuitionRecord => ({
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
    const tuitionId = await tuitionEntitlementId(env, projectId);
    const paid = items.find((item) => item.entitlement_id === tuitionId);
    if (paid === undefined) return answer(false, null);
    return answer(true, paid.expires_at === null ? null : new Date(paid.expires_at).toISOString());
  } catch (error) {
    if (error instanceof RevenueCatUnavailable) return undefined;
    throw error;
  }
}

async function postJson(env: Bindings, path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${revenueCatApiBase}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.REVENUECAT_API_V2_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(fetchTimeoutMs),
    });
  } catch {
    throw new RevenueCatUnavailable();
  }
}

/**
 * Grants tuition to a customer until `expiresAt`, as a promotional entitlement (API v2's "Grant an
 * entitlement"). A customer RevenueCat has not seen yet is created first, under the same id the
 * phone logs in with. RevenueCat ignores a grant within two hours of one already given, which
 * leaves the customer holding tuition all the same. Throws `RevenueCatUnavailable` when RevenueCat
 * is not set up for this environment or does not take the grant.
 */
export async function grantTuition(
  env: Bindings,
  appUserId: string,
  expiresAt: Date,
): Promise<void> {
  const projectId = env.REVENUECAT_PROJECT_ID;
  if (!env.REVENUECAT_API_V2_KEY || !projectId) throw new RevenueCatUnavailable();
  const entitlementId = await tuitionEntitlementId(env, projectId);
  if (entitlementId === undefined) throw new RevenueCatUnavailable();
  const project = `/projects/${encodeURIComponent(projectId)}`;
  const grant = () =>
    postJson(
      env,
      `${project}/customers/${encodeURIComponent(appUserId)}/actions/grant_entitlement`,
      { entitlement_id: entitlementId, expires_at: expiresAt.getTime() },
    );
  let response = await grant();
  if (response.status === 404) {
    const created = await postJson(env, `${project}/customers`, { id: appUserId });
    // 409: the customer was made in the meantime, by the phone's first call to RevenueCat.
    if (!created.ok && created.status !== 409) throw new RevenueCatUnavailable();
    response = await grant();
  }
  if (!response.ok) throw new RevenueCatUnavailable();
}
