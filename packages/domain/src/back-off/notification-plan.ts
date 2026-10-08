import type { Attitude, ClockTime, IsoDate } from '../contracts';
import {
  DAY_ROLLOVER_HOUR,
  addDays,
  clockMinutes,
  daysBetween,
  instantOfLocal,
  type Instant,
} from '../day';

/** How loud a notification is written, quietest first. `theatre` is Unhinged at full volume. */
export const NOTIFICATION_VOLUMES = ['soft', 'cheeky', 'sheepish', 'theatre'] as const;
export type NotificationVolume = (typeof NOTIFICATION_VOLUMES)[number];

const ATTITUDES: Record<Attitude, { readonly limit: number; readonly volume: NotificationVolume }> =
  {
    soft: { limit: 1, volume: 'soft' },
    cheeky: { limit: 3, volume: 'cheeky' },
    unhinged: { limit: 3, volume: 'theatre' },
  };

/** The most notifications a day at this attitude, before any back-off. */
export function dailyNotificationLimit(attitude: Attitude): number {
  return ATTITUDES[attitude].limit;
}

/**
 * The back-off table from the design board. A row holds until the next one starts, and no attitude
 * goes above its own limit or volume.
 */
export const BACK_OFF_TABLE: readonly {
  readonly fromIgnoredDays: number;
  readonly count: number;
  readonly volume: NotificationVolume;
}[] = [
  { fromIgnoredDays: 0, count: 3, volume: 'theatre' },
  { fromIgnoredDays: 1, count: 2, volume: 'sheepish' },
  { fromIgnoredDays: 2, count: 1, volume: 'cheeky' },
  { fromIgnoredDays: 4, count: 0, volume: 'soft' },
];

export const SILENT_FROM_IGNORED_DAYS = 4;
/** Once silent, one soft note goes out every this many days. */
export const SOFT_NOTE_EVERY_DAYS = 7;
/** Minutes between two notifications on the same day. */
export const NOTIFICATION_SPACING_MINUTES = 45;

const DAY_MINUTES = 24 * 60;

export interface QuietHours {
  readonly start: ClockTime;
  readonly end: ClockTime;
}

export interface NotificationPlanInput {
  readonly attitude: Attitude;
  /** Days in a row the app was not opened before this one. Opening the app makes it zero. */
  readonly ignoredDays: number;
  /** The Scootch day being planned, and the zone its clock times are in. */
  readonly localDate: IsoDate;
  readonly timeZone: string;
  readonly quietHours: QuietHours;
  /** The time of day the user usually starts. */
  readonly usualStart: ClockTime;
  /** How many lines today's task has; the plan never asks for more. */
  readonly available?: number;
}

export interface PlannedNotification {
  readonly at: Instant;
  /** Which of the day's lines to send, counted from 0 in the order they were written. */
  readonly ordinal: number;
  /** The volume to send it at. Below the user's attitude, the line comes from that quieter voice. */
  readonly volume: NotificationVolume;
  /** 1 to 3 within the day; it only climbs while Unhinged is above Cheeky volume. */
  readonly loudness: number;
}

/** The day's notifications. Nothing in it says how long the user has been away. */
export interface NotificationPlan {
  readonly notifications: readonly PlannedNotification[];
}

/** Days in a row the app went unopened before `today`. Opened yesterday or today: none. */
export function ignoredDaysBefore(lastOpenedDay: IsoDate | null, today: IsoDate): number {
  return lastOpenedDay === null ? 0 : Math.max(0, daysBetween(lastOpenedDay, today) - 1);
}

/** True inside quiet hours. The start is quiet and the end is not; equal times mean none are set. */
export function isQuietMinute(minuteOfDay: number, quietHours: QuietHours): boolean {
  const minute = ((minuteOfDay % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const start = clockMinutes(quietHours.start);
  const end = clockMinutes(quietHours.end);
  if (start === end) return false;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

function quieter(a: NotificationVolume, b: NotificationVolume): NotificationVolume {
  return NOTIFICATION_VOLUMES.indexOf(a) <= NOTIFICATION_VOLUMES.indexOf(b) ? a : b;
}

function levelFor(attitude: Attitude, ignoredDays: number) {
  const mine = ATTITUDES[attitude];
  if (ignoredDays >= SILENT_FROM_IGNORED_DAYS) {
    const silentFor = ignoredDays - SILENT_FROM_IGNORED_DAYS;
    const noteDay = silentFor > 0 && silentFor % SOFT_NOTE_EVERY_DAYS === 0;
    return { count: noteDay ? 1 : 0, volume: 'soft' as const };
  }
  const row = BACK_OFF_TABLE.findLast((one) => one.fromIgnoredDays <= ignoredDays);
  return row
    ? { count: Math.min(row.count, mine.limit), volume: quieter(row.volume, mine.volume) }
    : { count: 0, volume: 'soft' as const };
}

/**
 * The notification plan for one day. The first goes out when the user usually starts and the rest
 * follow 45 minutes apart. A usual start inside quiet hours waits for them to end; a time that still
 * lands in quiet hours, or after the day has rolled over, is not sent.
 */
export function notificationPlan(input: NotificationPlanInput): NotificationPlan {
  const ignoredDays = Number.isFinite(input.ignoredDays)
    ? Math.max(0, Math.floor(input.ignoredDays))
    : 0;
  const level = levelFor(input.attitude, ignoredDays);
  const count = Math.max(0, Math.min(level.count, Math.floor(input.available ?? level.count)));
  const climbs =
    input.attitude === 'unhinged' &&
    NOTIFICATION_VOLUMES.indexOf(level.volume) > NOTIFICATION_VOLUMES.indexOf('cheeky');

  // Minutes from local midnight of `localDate`; the small hours belong to the calendar day after.
  const dayStart = DAY_ROLLOVER_HOUR * 60;
  let first = clockMinutes(input.usualStart);
  if (first < dayStart) first += DAY_MINUTES;
  while (isQuietMinute(first, input.quietHours)) first += 1;

  const notifications: PlannedNotification[] = [];
  for (let ordinal = 0; ordinal < count; ordinal += 1) {
    const minute = first + ordinal * NOTIFICATION_SPACING_MINUTES;
    if (minute >= dayStart + DAY_MINUTES || isQuietMinute(minute, input.quietHours)) continue;
    const clock = `${String(Math.floor((minute % DAY_MINUTES) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    notifications.push({
      at: instantOfLocal(
        addDays(input.localDate, Math.floor(minute / DAY_MINUTES)),
        clock,
        input.timeZone,
      ),
      ordinal,
      volume: level.volume,
      loudness: climbs ? ordinal + 1 : 1,
    });
  }
  return { notifications };
}
