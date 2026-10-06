-- Monsters shared from the website's monster maker. A row exists only while the monster is shared:
-- unsharing deletes it. The typed line is null unless the visitor left "show what I typed" on.
-- The unshare token itself never reaches the database: only its SHA-256 hash does.
-- Times are ISO 8601 in UTC.
CREATE TABLE shared_monsters (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  body_type TEXT NOT NULL,
  name TEXT NOT NULL,
  flavour_text TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'vi')),
  typed_line TEXT,
  unshare_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  -- Set when the owner catches it in the app; the page and its link preview then read CAUGHT.
  caught_at TEXT,
  catch_minutes INTEGER CHECK (catch_minutes IS NULL OR catch_minutes >= 1)
);

-- Caught cards and share stories shared from the app. The payload is JSON holding only what the
-- sharer chose to show: a hidden task is absent from it, not flagged.
CREATE TABLE shared_cards (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('card', 'story')),
  language TEXT NOT NULL CHECK (language IN ('en', 'vi')),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- People who asked for one email on the day the app is out. One row per address, lower-cased.
-- The monster id is the monster that email's link carries into the app.
CREATE TABLE waitlist (
  email TEXT PRIMARY KEY,
  ios INTEGER NOT NULL DEFAULT 0 CHECK (ios IN (0, 1)),
  android INTEGER NOT NULL DEFAULT 0 CHECK (android IN (0, 1)),
  monster_id TEXT,
  language TEXT NOT NULL CHECK (language IN ('en', 'vi')),
  created_at TEXT NOT NULL
);
