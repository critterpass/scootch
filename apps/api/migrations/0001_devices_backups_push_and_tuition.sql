-- Anonymous devices. The token itself never reaches the database: only its SHA-256 hash does.
-- Times are ISO 8601 in UTC.
CREATE TABLE devices (
  token_hash TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('en', 'vi')),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- The cost ledger: one row per model call, with no request or response text. The project tag
-- tells this app's spend apart from other apps sharing the same provider keys. Deleting a device
-- keeps the spend and drops the link to it.
CREATE TABLE ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
  device_hash TEXT REFERENCES devices (token_hash) ON DELETE SET NULL,
  project TEXT NOT NULL DEFAULT 'phusclass',
  created_at TEXT NOT NULL
);

CREATE INDEX ai_usage_created_at ON ai_usage (created_at);
CREATE INDEX ai_usage_device_hash ON ai_usage (device_hash);

-- Feature flag overrides. A flag with no row uses its default from the code.
CREATE TABLE flags (
  name TEXT PRIMARY KEY,
  "on" INTEGER NOT NULL CHECK ("on" IN (0, 1))
);

-- When the operations bot last sent each kind of alert, so one kind cannot flood the chat.
-- One row per kind; times are ISO 8601 in UTC.
CREATE TABLE bot_alerts (
  kind TEXT PRIMARY KEY,
  last_sent_at TEXT NOT NULL
);

-- Backups with no account. A phone keeps an anonymous backup token and sends one snapshot of its
-- own data under it; a newer snapshot replaces the older one. The token itself never reaches the
-- database: only its SHA-256 hash does, and nothing here says which device sent the snapshot.
-- The snapshot is JSON text. Times are ISO 8601 in UTC.
CREATE TABLE backup_snapshots (
  token_hash TEXT PRIMARY KEY,
  snapshot TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tokens Apple gave a phone, so the server can reach it: the device's own token (`alert`), a
-- Live Activity's push-to-start token and the tokens of running activities. Apple's token cannot
-- be hashed: it is the address a push is sent to. It goes when the device does.
CREATE TABLE push_tokens (
  token TEXT PRIMARY KEY CHECK (length(token) BETWEEN 64 AND 200 AND token NOT GLOB '*[^0-9a-f]*'),
  device_hash TEXT NOT NULL REFERENCES devices (token_hash) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('alert', 'live_activity_start', 'live_activity')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  bundle_id TEXT NOT NULL CHECK (bundle_id IN ('com.phusclass', 'com.phusclass.dev')),
  updated_at TEXT NOT NULL CHECK ((length(updated_at) = 24 AND updated_at NOT GLOB '*[^0-9TZ:.-]*'))
);
CREATE INDEX push_tokens_device ON push_tokens (device_hash);

-- Whether a store customer pays tuition, as the server knows it: from RevenueCat's webhook, or
-- from one question to RevenueCat's API when no event has arrived yet. One row per RevenueCat app
-- user id. `expires_at` is NULL for a purchase that never ends. `event_at` is when RevenueCat says
-- the newest event behind the row happened (or when the API was asked), so an older event
-- arriving late never overwrites a newer one.
CREATE TABLE tuition_entitlements (
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
