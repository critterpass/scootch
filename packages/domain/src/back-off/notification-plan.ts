import type { Attitude, ClockTime, IsoDate } from '../contracts';
import {
  DAY_ROLLOVER_HOUR,
  addDays,
  clockMinutes,
  daysBetween,
  instantOfLocal,
  localDateTime,
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

/**
 * A notification with a time of its own. `cue` is a set thing coming back when the user asked for
 * it; `get_ready` is the one nudge before a time the user said.
 */
export interface TimedNotification {
  readonly kind: 'cue' | 'get_ready';
  readonly at: Instant;
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
  /**
   * The day's cue and get-ready nudge, at most one of each. Each takes the place of one of the
   * day's notifications, so the day never holds more than it would without them.
   */
  readonly timed?: readonly TimedNotification[];
  /** The cue is for a serious task: plain words, at the soft volume, signed by no monster. */
  readonly plain?: boolean;
}

export interface PlannedNotification {
  readonly at: Instant;
  /** Which of the day's lines to send, counted from 0 in the order they were written. */
  readonly ordinal: number;
  /** The volume to send it at. Below the user's attitude, the line comes from that quieter voice. */
  readonly volume: NotificationVolume;
  /** 1 to 3 within the day; it only climbs while Unhinged is above Cheeky volume. */
  readonly loudness: number;
  /**
   * Set on a cue or a get-ready nudge, and absent on the day's own lines. Its words are its own:
   * `ordinal` is then the line whose place it took, which is not sent. A get-ready nudge is from
   * Scootch, never from a monster.
   */
  readonly kind?: TimedNotification['kind'];
  /** Set on the cue of a serious task: plain words, and no monster signs it. */
  readonly plain?: true;
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

const clockOfMinute = (minute: number) =>
  `${String(Math.floor((minute % DAY_MINUTES) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

const tooClose = (a: number, b: number) => Math.abs(a - b) < NOTIFICATION_SPACING_MINUTES;

interface Placed {
  readonly kind: TimedNotification['kind'];
  readonly minute: number;
  readonly at: Instant;
}

/**
 * Where the day's cue and get-ready nudge go, in minutes from local midnight of the day, and no
 * more of them than `room`. The get-ready nudge is placed first: it is the one that cannot wait.
 * A cue inside quiet hours waits for them to end; a nudge to get ready is never sent late, so
 * inside quiet hours it is not sent. Neither is sent outside its own Scootch day, and a cue
 * closer to the nudge than the day's spacing gives way to it.
 */
function placeTimed(input: NotificationPlanInput, room: number): Placed[] {
  const dayStart = DAY_ROLLOVER_HOUR * 60;
  const placed: Placed[] = [];
  for (const kind of ['get_ready', 'cue'] as const) {
    const wanted = input.timed?.find((one) => one.kind === kind);
    if (!wanted || !Number.isFinite(wanted.at) || placed.length >= room) continue;
    const local = localDateTime(wanted.at, input.timeZone);
    const asked =
      daysBetween(input.localDate, local.date) * DAY_MINUTES + local.hour * 60 + local.minute;
    if (asked < dayStart) continue;
    let minute = asked;
    if (kind === 'cue') while (isQuietMinute(minute, input.quietHours)) minute += 1;
    if (minute >= dayStart + DAY_MINUTES) continue;
    if (isQuietMinute(minute, input.quietHours)) continue;
    if (placed.some((other) => tooClose(other.minute, minute))) continue;
    const at =
      minute === asked
        ? wanted.at
        : instantOfLocal(
            addDays(input.localDate, Math.floor(minute / DAY_MINUTES)),
            clockOfMinute(minute),
            input.timeZone,
          );
    placed.push({ kind, minute, at });
  }
  return placed;
}

/**
 * The notification plan for one day. The first goes out when the user usually starts and the rest
 * follow 45 minutes apart. A usual start inside quiet hours waits for them to end; a time that still
 * lands in quiet hours, or after the day has rolled over, is not sent.
 *
 * A cue and a get-ready nudge are sent at their own times and each takes one of the day's places:
 * the attitude's limit and the back-off count them like any other, so a day that would send none
 * sends none of these either. The day's own lines keep their spacing from them.
 */
export function notificationPlan(input: NotificationPlanInput): NotificationPlan {
  const ignoredDays = Number.isFinite(input.ignoredDays)
    ? Math.max(0, Math.floor(input.ignoredDays))
    : 0;
  const level = levelFor(input.attitude, ignoredDays);
  const timed = placeTimed(input, level.count);
  const left = level.count - timed.length;
  const count = Math.max(0, Math.min(left, Math.floor(input.available ?? left)));
  const climbs =
    input.attitude === 'unhinged' &&
    NOTIFICATION_VOLUMES.indexOf(level.volume) > NOTIFICATION_VOLUMES.indexOf('cheeky');

  // Minutes from local midnight of `localDate`; the small hours belong to the calendar day after.
  const dayStart = DAY_ROLLOVER_HOUR * 60;
  let minute = clockMinutes(input.usualStart);
  if (minute < dayStart) minute += DAY_MINUTES;
  while (isQuietMinute(minute, input.quietHours)) minute += 1;

  const notifications: PlannedNotification[] = [];
  for (let ordinal = 0; ordinal < count; ordinal += 1) {
    // One of the day's own lines never crowds a cue or a nudge: it waits out the spacing after it.
    for (let near = timed.find((one) => tooClose(one.minute, minute)); near;) {
      minute = near.minute + NOTIFICATION_SPACING_MINUTES;
      near = timed.find((one) => tooClose(one.minute, minute));
    }
    const sent = minute < dayStart + DAY_MINUTES && !isQuietMinute(minute, input.quietHours);
    if (sent) {
      notifications.push({
        at: instantOfLocal(
          addDays(input.localDate, Math.floor(minute / DAY_MINUTES)),
          clockOfMinute(minute),
          input.timeZone,
        ),
        ordinal,
        volume: level.volume,
        loudness: climbs ? ordinal + 1 : 1,
      });
    }
    minute += NOTIFICATION_SPACING_MINUTES;
  }
  // The places the timed ones took are the last of the day's lines, the loudest, which stay unsent.
  const byTime = [...timed].sort((a, b) => a.minute - b.minute);
  for (const [index, one] of byTime.entries()) {
    const plain = one.kind === 'cue' && input.plain === true;
    notifications.push({
      at: one.at,
      ordinal: count + index,
      volume: plain ? 'soft' : level.volume,
      loudness: 1,
      kind: one.kind,
      ...(plain ? { plain: true as const } : {}),
    });
  }
  return {
    notifications: timed.length > 0 ? notifications.sort((a, b) => a.at - b.at) : notifications,
  };
}
