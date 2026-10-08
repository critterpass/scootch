-- Who is in a session right now, so the app can say how many are. One row per device while it
-- hunts: the device's token hash and when the session began, nothing about the task. The row goes
-- when the session ends, when the longest session length has passed, or when the device does.
CREATE TABLE hunting_beats (
  device_hash TEXT PRIMARY KEY REFERENCES devices (token_hash) ON DELETE CASCADE,
  began_at TEXT NOT NULL CHECK ((length(began_at) = 24 AND began_at NOT GLOB '*[^0-9TZ:.-]*'))
);
CREATE INDEX hunting_beats_began_at ON hunting_beats (began_at);
