/**
 * RevenueCat at the network boundary: webhook deliveries and API v2 answers, shaped field for field
 * like the samples in RevenueCat's documentation (webhook event types and fields, and the API v2
 * customer and entitlement resources), with this app's products and entitlement.
 */

export const projectId = 'proj1ab2c3d4';
/** RevenueCat's own id for the entitlement whose lookup key is `tuition`. */
export const tuitionEntitlementId = 'entla1b2c3d4e5';

const day = 24 * 60 * 60 * 1000;

export type EventFields = Record<string, unknown> & { id: string; type: string };

/**
 * One webhook delivery. The defaults are the documented INITIAL_PURCHASE sample, renamed to a
 * yearly tuition trial in the sandbox; `fields` replace or add to them.
 */
export function delivery(appUserId: string, fields: EventFields, at = Date.now()) {
  return {
    api_version: '1.0',
    event: {
      aliases: [appUserId],
      app_id: 'app1a2b3c4',
      app_user_id: appUserId,
      commission_percentage: 0.15,
      country_code: 'VN',
      currency: 'USD',
      entitlement_id: 'tuition',
      entitlement_ids: ['tuition'],
      environment: 'SANDBOX',
      event_timestamp_ms: at,
      expiration_at_ms: at + 7 * day,
      is_family_share: false,
      offer_code: null,
      original_app_user_id: appUserId,
      original_transaction_id: '2000000712345678',
      period_type: 'TRIAL',
      presented_offering_id: 'default',
      price: 0,
      price_in_purchased_currency: 0,
      product_id: 'phusclass.dev.tuition.yearly',
      purchased_at_ms: at,
      store: 'APP_STORE',
      subscriber_attributes: {},
      takehome_percentage: 0.85,
      tax_percentage: 0,
      transaction_id: '2000000712345678',
      ...fields,
    },
  };
}

/** A TRANSFER, as documented: no product or entitlement, only where the purchases went. */
export function transferDelivery(id: string, from: string[], to: string[], at = Date.now()) {
  return {
    api_version: '1.0',
    event: {
      app_id: 'app1a2b3c4',
      environment: 'SANDBOX',
      event_timestamp_ms: at,
      id,
      store: 'APP_STORE',
      subscriber_attributes: {},
      transferred_from: from,
      transferred_to: to,
      type: 'TRANSFER',
    },
  };
}

/** API v2's "Get a customer", with the given active entitlements. */
export function customerAnswer(
  customerId: string,
  active: { entitlement_id: string; expires_at: number | null }[],
) {
  const base = `/v2/projects/${projectId}/customers/${customerId}`;
  return {
    object: 'customer',
    id: customerId,
    project_id: projectId,
    first_seen_at: 1_790_000_000_000,
    last_seen_at: 1_790_000_000_000,
    last_seen_app_version: '1.0.0',
    last_seen_country: 'VN',
    last_seen_platform: 'iOS',
    last_seen_platform_version: '26.0',
    active_entitlements: {
      object: 'list',
      items: active.map((item) => ({ object: 'customer.active_entitlement', ...item })),
      next_page: null,
      url: `${base}/active_entitlements`,
    },
    experiment: null,
  };
}

/** API v2's "Get a list of entitlements" for the project: tuition, and one other. */
export const entitlementsAnswer = {
  object: 'list',
  items: [
    {
      object: 'entitlement',
      project_id: projectId,
      id: tuitionEntitlementId,
      lookup_key: 'tuition',
      display_name: "Phu's Class tuition",
      created_at: 1_790_000_000_000,
      state: 'active',
      products: null,
    },
    {
      object: 'entitlement',
      project_id: projectId,
      id: 'entlz9y8x7w6v5',
      lookup_key: 'studio',
      display_name: 'Studio',
      created_at: 1_790_000_000_000,
      state: 'active',
      products: null,
    },
  ],
  next_page: null,
  url: `/v2/projects/${projectId}/entitlements`,
};

/** API v2's answer for a customer it has never seen. */
export const customerNotFound = {
  object: 'error',
  type: 'resource_missing',
  message: 'Customer not found.',
  retryable: false,
  doc_url: 'https://errors.rev.cat/resource-missing',
};

/**
 * API v2's answer to "Grant an entitlement": 201 with the customer, now holding the promotional
 * entitlement until the asked time.
 */
export function grantAnswer(customerId: string, expiresAt: number): Response {
  return Response.json(
    customerAnswer(customerId, [{ entitlement_id: tuitionEntitlementId, expires_at: expiresAt }]),
    { status: 201 },
  );
}

/** API v2's answer to "Create a customer": 201 with the new customer, holding nothing. */
export function createdCustomerAnswer(customerId: string): Response {
  return Response.json(customerAnswer(customerId, []), { status: 201 });
}
