/**
 * The founder's day: Asia/Ho_Chi_Minh, which is UTC+7 all year. "Today", "yesterday" and "this
 * month" in the bot's answers are cut on this clock; the database keeps UTC.
 */
const offsetMs = 7 * 60 * 60 * 1000;
export const dayMs = 24 * 60 * 60 * 1000;

/** The instant the founder's day began, `daysAgo` days back from the day `now` falls in. */
export function dayStart(now: Date, daysAgo = 0): Date {
  const localDay = Math.floor((now.getTime() + offsetMs) / dayMs);
  return new Date((localDay - daysAgo) * dayMs - offsetMs);
}

/** The instant the founder's month began. */
export function monthStart(now: Date): Date {
  const local = new Date(now.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs);
}

/** The calendar date, `2026-10-06`, of the founder's day that begins at `start`. */
export function dayLabel(start: Date): string {
  return new Date(start.getTime() + offsetMs).toISOString().slice(0, 10);
}
