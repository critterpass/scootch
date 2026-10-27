import type { Happening } from './happenings';
import { shortName } from './short-name';
import type { CareFlag, Carving, CarvingKind, CommentStep, Slip, Task, TaskStatus } from './task';

/**
 * The board's tables in the app's SQLite, as statements the app runs in order, and the row each
 * gives back. Times are epoch milliseconds, days are `YYYY-MM-DD`, clock times `HH:mm`, booleans
 * 0 or 1.
 */

export const CREATE_TASKS = `CREATE TABLE IF NOT EXISTS tasks (
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
  swapped_at INTEGER,
  short TEXT
) STRICT`;

export const CREATE_TASKS_STATUS_INDEX =
  'CREATE INDEX IF NOT EXISTS tasks_by_status ON tasks (status, due_date)';

export const CREATE_SLIPS = `CREATE TABLE IF NOT EXISTS slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
  at INTEGER NOT NULL
) STRICT`;

export const CREATE_SLIPS_TASK_INDEX =
  'CREATE INDEX IF NOT EXISTS slips_by_task ON slips (task_id, at)';

export const CREATE_SESSIONS = `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  minutes INTEGER NOT NULL,
  inside_fuse INTEGER NOT NULL CHECK (inside_fuse IN (0, 1)),
  happening TEXT,
  ended_at INTEGER,
  outcome TEXT CHECK (outcome IN ('done', 'another period', 'back on board', 'erase', 'slipped'))
) STRICT`;

/** A finish, kept apart from the task so the logbook survives a reword. */
export const CREATE_LOGBOOK = `CREATE TABLE IF NOT EXISTS logbook (
  task_id TEXT PRIMARY KEY NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done_at INTEGER NOT NULL,
  day TEXT NOT NULL,
  period_minutes INTEGER,
  comment TEXT CHECK (comment IN ('fine', 'good', 'good work', 'ten')),
  carving TEXT,
  giay_khen INTEGER NOT NULL DEFAULT 0 CHECK (giay_khen IN (0, 1))
) STRICT`;

export const CREATE_LOGBOOK_ORDER_INDEX =
  'CREATE INDEX IF NOT EXISTS logbook_newest ON logbook (done_at DESC)';

/** No foreign key: the desk never loses a mark, even when its task is erased. */
export const CREATE_CARVINGS = `CREATE TABLE IF NOT EXISTS carvings (
  task_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  turn INTEGER NOT NULL,
  at INTEGER NOT NULL
) STRICT`;

/** The user's settings, one JSON value per key. */
export const CREATE_SETTINGS = `CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
) STRICT`;

/** The board's own small state: the day of the last long-board remark, the last pinned notice. */
export const CREATE_KV = `CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT`;

/** Every statement, in the order they must run. */
export const BOARD_SCHEMA: readonly string[] = [
  CREATE_TASKS,
  CREATE_TASKS_STATUS_INDEX,
  CREATE_SLIPS,
  CREATE_SLIPS_TASK_INDEX,
  CREATE_SESSIONS,
  CREATE_LOGBOOK,
  CREATE_LOGBOOK_ORDER_INDEX,
  CREATE_CARVINGS,
  CREATE_SETTINGS,
  CREATE_KV,
];

/** Keys the board keeps in `kv`. */
export const KV_KEYS = {
  longBoardRemarkedOn: 'board.long-remarked-on',
  tuitionNoticePinnedAt: 'tuition.notice-pinned-at',
  finishes: 'board.finishes',
} as const;

export type TaskRow = {
  id: string;
  text: string;
  created_at: number;
  due_date: string | null;
  heard_time_day: string | null;
  heard_time_at: string | null;
  last_touched: number;
  partial_note: string | null;
  status: TaskStatus;
  desk_since: number | null;
  desk_opened: number | null;
  desk_started_at: number | null;
  desk_inside_fuse: 0 | 1 | null;
  care: CareFlag;
  screened: 0 | 1;
  still_yours_asked_at: number | null;
  size_minutes: number | null;
  swapped_at: number | null;
  /** `null` on a task written before short names: it is worked out when read. */
  short: string | null;
};

export type SlipRow = {
  id: number;
  task_id: string;
  reason: string;
  accepted: 0 | 1;
  at: number;
};

export type SessionRow = {
  id: string;
  task_id: string;
  started_at: number;
  minutes: number;
  inside_fuse: 0 | 1;
  happening: Happening | null;
  ended_at: number | null;
  outcome: 'done' | 'another period' | 'back on board' | 'erase' | 'slipped' | null;
};

export type LogbookRow = {
  task_id: string;
  text: string;
  done_at: number;
  day: string;
  period_minutes: number | null;
  comment: CommentStep | null;
  carving: CarvingKind | null;
  giay_khen: 0 | 1;
};

export type CarvingRow = {
  task_id: string;
  kind: CarvingKind;
  x: number;
  y: number;
  turn: number;
  at: number;
};

export type SettingRow = { key: string; value: string };
export type KvRow = { key: string; value: string; updated_at: number };

const bit = (value: boolean): 0 | 1 => (value ? 1 : 0);

export function taskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    text: task.text,
    created_at: task.createdAt,
    due_date: task.dueDate,
    heard_time_day: task.heardTime?.day ?? null,
    heard_time_at: task.heardTime?.at ?? null,
    last_touched: task.lastTouched,
    partial_note: task.partialNote,
    status: task.status,
    desk_since: task.desk?.since ?? null,
    desk_opened: task.desk?.opened ?? null,
    desk_started_at: task.desk?.startedAt ?? null,
    desk_inside_fuse: task.desk?.insideFuse == null ? null : bit(task.desk.insideFuse),
    care: task.care,
    screened: bit(task.screened),
    still_yours_asked_at: task.stillYoursAskedAt,
    size_minutes: task.order.minutes,
    swapped_at: task.order.swappedAt,
    short: task.short,
  };
}

/** A task from its row, its slips (any order) and its logbook row when it is done. */
export function taskFromRows(
  row: TaskRow,
  slips: readonly SlipRow[],
  finished: LogbookRow | null,
): Task {
  const ownSlips: Slip[] = slips
    .filter((slip) => slip.task_id === row.id)
    .sort((a, b) => a.at - b.at || a.id - b.id)
    .map((slip) => ({ reason: slip.reason, accepted: slip.accepted === 1, at: slip.at }));
  return {
    id: row.id,
    text: row.text,
    short: row.short ?? shortName(row.text),
    createdAt: row.created_at,
    dueDate: row.due_date,
    heardTime:
      row.heard_time_day !== null && row.heard_time_at !== null
        ? { day: row.heard_time_day, at: row.heard_time_at }
        : null,
    lastTouched: row.last_touched,
    slips: ownSlips,
    partialNote: row.partial_note,
    status: row.status,
    desk:
      row.desk_since === null
        ? null
        : {
            since: row.desk_since,
            opened: row.desk_opened ?? row.desk_since,
            startedAt: row.desk_started_at,
            insideFuse: row.desk_inside_fuse === null ? null : row.desk_inside_fuse === 1,
          },
    done:
      finished === null
        ? null
        : {
            at: finished.done_at,
            day: finished.day,
            periodMinutes: finished.period_minutes,
            comment: finished.comment,
            carving: finished.carving,
            giayKhen: finished.giay_khen === 1,
          },
    care: row.care,
    screened: row.screened === 1,
    stillYoursAskedAt: row.still_yours_asked_at,
    order: { minutes: row.size_minutes, swappedAt: row.swapped_at },
  };
}

export function logbookRowOf(task: Task): LogbookRow | null {
  if (task.done === null) return null;
  return {
    task_id: task.id,
    text: task.text,
    done_at: task.done.at,
    day: task.done.day,
    period_minutes: task.done.periodMinutes,
    comment: task.done.comment,
    carving: task.done.carving,
    giay_khen: bit(task.done.giayKhen),
  };
}

export function carvingToRow(carving: Carving): CarvingRow {
  return {
    task_id: carving.taskId,
    kind: carving.kind,
    x: carving.x,
    y: carving.y,
    turn: carving.turn,
    at: carving.at,
  };
}

export function carvingFromRow(row: CarvingRow): Carving {
  return { taskId: row.task_id, kind: row.kind, x: row.x, y: row.y, turn: row.turn, at: row.at };
}
