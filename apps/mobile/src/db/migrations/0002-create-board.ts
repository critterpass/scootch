// The board's tables. Written out here, not imported, so this migration never changes once it has
// run on a phone; the board's row types in `@phusclass/domain/board` must keep matching it, which
// the data tests check against a migrated database.
export const sql = `
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    due_date TEXT,
    heard_time_day TEXT,
    heard_time_at TEXT,
    last_touched INTEGER NOT NULL,
    partial_note TEXT,
    status TEXT NOT NULL CHECK (status IN ('board', 'desk', 'done', 'erased')),
    desk_since INTEGER,
    desk_opened INTEGER,
    desk_started_at INTEGER,
    desk_inside_fuse INTEGER CHECK (desk_inside_fuse IN (0, 1)),
    care TEXT NOT NULL DEFAULT 'none' CHECK (care IN ('none', 'serious', 'crisis')),
    screened INTEGER NOT NULL DEFAULT 0 CHECK (screened IN (0, 1)),
    still_yours_asked_at INTEGER,
    size_minutes INTEGER,
    swapped_at INTEGER
  ) STRICT;
  CREATE INDEX tasks_by_status ON tasks (status, due_date);

  CREATE TABLE slips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
    at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX slips_by_task ON slips (task_id, at);

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    started_at INTEGER NOT NULL,
    minutes INTEGER NOT NULL,
    inside_fuse INTEGER NOT NULL CHECK (inside_fuse IN (0, 1)),
    happening TEXT,
    ended_at INTEGER,
    outcome TEXT CHECK (outcome IN ('done', 'another period', 'back on board', 'erase', 'slipped'))
  ) STRICT;

  CREATE TABLE logbook (
    task_id TEXT PRIMARY KEY NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    done_at INTEGER NOT NULL,
    day TEXT NOT NULL,
    period_minutes INTEGER,
    comment TEXT CHECK (comment IN ('fine', 'good', 'good work', 'ten')),
    carving TEXT,
    giay_khen INTEGER NOT NULL DEFAULT 0 CHECK (giay_khen IN (0, 1))
  ) STRICT;
  CREATE INDEX logbook_newest ON logbook (done_at DESC);

  CREATE TABLE carvings (
    task_id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    turn INTEGER NOT NULL,
    at INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
`;
