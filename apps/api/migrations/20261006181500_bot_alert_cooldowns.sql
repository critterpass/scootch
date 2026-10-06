-- When the operations bot last sent each kind of alert, so one kind cannot flood the chat.
-- One row per kind; times are ISO 8601 in UTC.
CREATE TABLE bot_alerts (
  kind TEXT PRIMARY KEY,
  last_sent_at TEXT NOT NULL
);
