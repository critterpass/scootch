-- Whether a store customer holds Plus, as the server knows it: from RevenueCat's webhook, or from
-- one question to RevenueCat's API when no event has arrived yet. One row per RevenueCat app user
-- id. `expires_at` is NULL for a purchase that never ends. `event_at` is when RevenueCat says the
-- newest event behind the row happened (or when the API was asked), so an older event arriving
-- late never overwrites a newer one.
CREATE TABLE plus_entitlements (
  app_user_id TEXT PRIMARY KEY,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  expires_at TEXT CHECK (
    expires_at IS NULL OR (length(expires_at) = 24 AND expires_at NOT GLOB '*[^0-9TZ:.-]*')
  ),
  product_id TEXT,
  store_environment TEXT CHECK (store_environment IN ('sandbox', 'production')),
  source TEXT NOT NULL CHECK (source IN ('webhook', 'api')),
  last_event_id TEXT,
  event_at TEXT NOT NULL CHECK ((length(event_at) = 24 AND event_at NOT GLOB '*[^0-9TZ:.-]*')),
  updated_at TEXT NOT NULL CHECK ((length(updated_at) = 24 AND updated_at NOT GLOB '*[^0-9TZ:.-]*'))
);

-- Every webhook event already taken in, by RevenueCat's event id, so a delivery sent again changes
-- nothing. Kept for thirty days, far longer than RevenueCat goes on retrying.
CREATE TABLE revenuecat_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL CHECK (
    (length(received_at) = 24 AND received_at NOT GLOB '*[^0-9TZ:.-]*')
  )
);
CREATE INDEX revenuecat_events_received_at ON revenuecat_events (received_at);
