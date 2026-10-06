-- Accounts, friends, tables, seat controls and haunts. Only tables need an account; a device with
-- none keeps everything else.
--
-- No column here can hold a user's task: every text column is an id, a hash, a time, or one of a
-- fixed list, and its CHECK says so. The single exception is `accounts.display_name`, a name of
-- at most 20 characters the user chose and the screen accepted. Times are ISO 8601 in UTC, as
-- `toISOString()` writes them: 24 characters of digits and punctuation, which each time column's
-- CHECK enforces. (D1 limits a GLOB pattern to 50 bytes, so the checks name the characters
-- allowed rather than spelling out the whole shape.)

CREATE TABLE accounts (
  id TEXT PRIMARY KEY CHECK (length(id) = 12 AND id NOT GLOB '*[^a-z2-7]*'),
  -- SHA-256 of Apple's stable subject. The subject itself, and any email, are never stored.
  apple_subject_hash TEXT NOT NULL UNIQUE
    CHECK (length(apple_subject_hash) = 64 AND apple_subject_hash NOT GLOB '*[^0-9a-f]*'),
  -- NULL until the person has chosen a name the screen accepts; no table without one.
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) BETWEEN 2 AND 20),
  can_be_haunted INTEGER NOT NULL DEFAULT 1 CHECK (can_be_haunted IN (0, 1)),
  warned_at TEXT CHECK (warned_at IS NULL OR (length(warned_at) = 24 AND warned_at NOT GLOB '*[^0-9TZ:.-]*')),
  banned_at TEXT CHECK (banned_at IS NULL OR (length(banned_at) = 24 AND banned_at NOT GLOB '*[^0-9TZ:.-]*')),
  created_at TEXT NOT NULL CHECK ((length(created_at) = 24 AND created_at NOT GLOB '*[^0-9TZ:.-]*'))
);

-- A device belongs to at most one account; an account may have several devices.
CREATE TABLE account_devices (
  device_hash TEXT PRIMARY KEY REFERENCES devices (token_hash) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL CHECK ((length(linked_at) = 24 AND linked_at NOT GLOB '*[^0-9TZ:.-]*'))
);
CREATE INDEX account_devices_account ON account_devices (account_id);

-- One-time values a phone hands to Apple, so an identity token cannot be used twice.
CREATE TABLE apple_nonces (
  nonce_hash TEXT PRIMARY KEY CHECK (length(nonce_hash) = 64 AND nonce_hash NOT GLOB '*[^0-9a-f]*'),
  device_hash TEXT NOT NULL REFERENCES devices (token_hash) ON DELETE CASCADE,
  expires_at TEXT NOT NULL CHECK ((length(expires_at) = 24 AND expires_at NOT GLOB '*[^0-9TZ:.-]*'))
);

-- Friendship exists only through an accepted invite. One row per pair, smaller id first.
CREATE TABLE friend_invites (
  code_hash TEXT PRIMARY KEY CHECK (length(code_hash) = 64 AND code_hash NOT GLOB '*[^0-9a-f]*'),
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL CHECK ((length(expires_at) = 24 AND expires_at NOT GLOB '*[^0-9TZ:.-]*'))
);

CREATE TABLE friendships (
  account_a TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  account_b TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL CHECK ((length(created_at) = 24 AND created_at NOT GLOB '*[^0-9TZ:.-]*')),
  PRIMARY KEY (account_a, account_b),
  CHECK (account_a < account_b)
);
CREATE INDEX friendships_b ON friendships (account_b);

-- Nudges from `muted` are dropped for `muter`. The muted person is never told.
CREATE TABLE mutes (
  muter TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  muted TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  PRIMARY KEY (muter, muted)
);
CREATE INDEX mutes_muted ON mutes (muted);

-- The two can no longer share a table, be friends or haunt each other, whoever blocked.
CREATE TABLE blocks (
  blocker TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  blocked TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  PRIMARY KEY (blocker, blocked)
);
CREATE INDEX blocks_blocked ON blocks (blocked);

-- An open table. The Durable Object holds its live state; this row is what routes check.
CREATE TABLE tables (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^a-z2-7]*'),
  -- NULL once the person who opened it has deleted their account.
  opened_by TEXT REFERENCES accounts (id) ON DELETE SET NULL,
  opened_at TEXT NOT NULL CHECK ((length(opened_at) = 24 AND opened_at NOT GLOB '*[^0-9TZ:.-]*')),
  closed_at TEXT CHECK (closed_at IS NULL OR (length(closed_at) = 24 AND closed_at NOT GLOB '*[^0-9TZ:.-]*'))
);

CREATE TABLE table_invites (
  code_hash TEXT PRIMARY KEY CHECK (length(code_hash) = 64 AND code_hash NOT GLOB '*[^0-9a-f]*'),
  table_id TEXT NOT NULL REFERENCES tables (id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL CHECK ((length(expires_at) = 24 AND expires_at NOT GLOB '*[^0-9TZ:.-]*'))
);

-- Who holds a seat where, written only by the table's Durable Object.
CREATE TABLE table_seats (
  table_id TEXT NOT NULL REFERENCES tables (id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  PRIMARY KEY (table_id, account_id)
);
CREATE INDEX table_seats_account ON table_seats (account_id);

-- A report outlives its reporter's account, without the link to them.
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter TEXT REFERENCES accounts (id) ON DELETE SET NULL,
  reported TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  table_id TEXT NOT NULL CHECK (length(table_id) = 16 AND table_id NOT GLOB '*[^a-z2-7]*'),
  reason TEXT NOT NULL
    CHECK (reason IN ('offensive_name', 'nudge_spam', 'feels_unsafe', 'something_else')),
  nudge_count INTEGER NOT NULL CHECK (typeof(nudge_count) = 'integer' AND nudge_count >= 0),
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('dismissed', 'warned', 'banned')),
  created_at TEXT NOT NULL CHECK ((length(created_at) = 24 AND created_at NOT GLOB '*[^0-9TZ:.-]*'))
);
CREATE INDEX reports_reporter ON reports (reporter, created_at);

-- A monster sent to a friend with a preset dare. Nothing here is readable by the sender.
CREATE TABLE haunts (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^a-z2-7]*'),
  sender TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  recipient TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  body_type TEXT NOT NULL CHECK (length(body_type) <= 16 AND body_type NOT GLOB '*[^a-z]*'),
  seed TEXT NOT NULL CHECK (length(seed) BETWEEN 8 AND 64 AND seed NOT GLOB '*[^0-9a-f-]*'),
  dare TEXT NOT NULL CHECK (length(dare) <= 24 AND dare NOT GLOB '*[^a-z_]*'),
  anonymous INTEGER NOT NULL CHECK (anonymous IN (0, 1)),
  state TEXT NOT NULL DEFAULT 'waiting' CHECK (state IN ('waiting', 'caught', 'shooed')),
  created_at TEXT NOT NULL CHECK ((length(created_at) = 24 AND created_at NOT GLOB '*[^0-9TZ:.-]*'))
);
CREATE INDEX haunts_recipient ON haunts (recipient, state);
CREATE INDEX haunts_pair ON haunts (sender, recipient, created_at);
