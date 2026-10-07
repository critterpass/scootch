-- Tokens Apple gave a phone, so the server can reach it: the device's own token (`alert`), a
-- Live Activity's push-to-start token and the tokens of running activities. Apple's token cannot
-- be hashed: it is the address a push is sent to. It goes when the device does.
CREATE TABLE push_tokens (
  token TEXT PRIMARY KEY CHECK (length(token) BETWEEN 64 AND 200 AND token NOT GLOB '*[^0-9a-f]*'),
  device_hash TEXT NOT NULL REFERENCES devices (token_hash) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('alert', 'live_activity_start', 'live_activity')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  bundle_id TEXT NOT NULL CHECK (bundle_id IN ('app.scootch', 'app.scootch.dev')),
  updated_at TEXT NOT NULL CHECK ((length(updated_at) = 24 AND updated_at NOT GLOB '*[^0-9TZ:.-]*'))
);
CREATE INDEX push_tokens_device ON push_tokens (device_hash);
