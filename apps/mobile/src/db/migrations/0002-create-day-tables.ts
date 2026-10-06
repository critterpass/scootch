// One table per row schema in the domain package's local-db contract: columns are the snake_case
// of the fields, booleans are 0 or 1 and objects are JSON text. The settings table already exists.
export const sql = `
  CREATE TABLE days (
    local_date TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    morning_line TEXT,
    energy TEXT
  );

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    local_date TEXT NOT NULL,
    text TEXT NOT NULL,
    original_text TEXT NOT NULL,
    source TEXT NOT NULL,
    screen TEXT NOT NULL,
    serious_overridden INTEGER NOT NULL,
    status TEXT NOT NULL,
    carried_over INTEGER NOT NULL,
    first_mentioned_on TEXT NOT NULL,
    due_date TEXT,
    work_mode TEXT,
    fits_ten_minutes INTEGER,
    share_private INTEGER,
    shrink_count INTEGER NOT NULL,
    lines TEXT,
    notifications TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE INDEX tasks_by_day ON tasks (local_date);

  CREATE TABLE drawer_items (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    screen TEXT NOT NULL,
    due_date TEXT,
    first_mentioned_on TEXT NOT NULL,
    last_mentioned_on TEXT NOT NULL,
    return_on TEXT,
    fades_on TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE monsters (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    spec TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    flavour_text TEXT NOT NULL,
    hatched_at TEXT NOT NULL,
    caught_at TEXT,
    caught_on TEXT,
    number INTEGER,
    rarity TEXT,
    days_lurked INTEGER,
    catch_minutes INTEGER,
    dread INTEGER,
    finish TEXT NOT NULL
  );
  CREATE INDEX monsters_by_task ON monsters (task_id);

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    local_date TEXT NOT NULL,
    planned_minutes INTEGER NOT NULL,
    treat TEXT,
    started_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    ended_at TEXT,
    outcome TEXT,
    finish_method TEXT,
    not_finished_choice TEXT,
    table_id TEXT
  );
  CREATE INDEX sessions_by_task ON sessions (task_id);

  CREATE TABLE parked_thoughts (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    text TEXT NOT NULL,
    parked_at TEXT NOT NULL,
    resolution TEXT
  );
  CREATE INDEX parked_thoughts_by_session ON parked_thoughts (session_id);

  CREATE TABLE world_pieces (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    monster_id TEXT,
    x REAL NOT NULL,
    y REAL NOT NULL,
    seed TEXT NOT NULL,
    added_on TEXT NOT NULL
  );

  CREATE TABLE record_bars (
    local_date TEXT PRIMARY KEY NOT NULL,
    week TEXT NOT NULL,
    position INTEGER NOT NULL,
    instrument TEXT NOT NULL,
    seed TEXT NOT NULL,
    monster_id TEXT
  );

  CREATE TABLE week_records (
    week TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    liner_note TEXT,
    sentence TEXT
  );
`;
