-- The number on a Scootch Plus member card: the next whole number, once for each device, in the
-- order people joined. AUTOINCREMENT never hands a number out twice, even after its row is gone.
-- The row goes when the device does.
CREATE TABLE member_numbers (
  number INTEGER PRIMARY KEY AUTOINCREMENT,
  device_hash TEXT NOT NULL UNIQUE REFERENCES devices (token_hash) ON DELETE CASCADE,
  issued_at TEXT NOT NULL CHECK ((length(issued_at) = 24 AND issued_at NOT GLOB '*[^0-9TZ:.-]*'))
);
