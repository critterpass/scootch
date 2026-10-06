-- Backups with no account. A phone keeps an anonymous backup token and sends one snapshot of its
-- own data under it; a newer snapshot replaces the older one. The token itself never reaches the
-- database: only its SHA-256 hash does, and nothing here says which device sent the snapshot.
-- The snapshot is JSON text. Times are ISO 8601 in UTC.
CREATE TABLE backup_snapshots (
  token_hash TEXT PRIMARY KEY,
  snapshot TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
