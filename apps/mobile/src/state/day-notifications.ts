import {
  ignoredDaysBefore,
  instantFromIso,
  localDateTime,
  notificationPlan,
  type Attitude,
  type ClockTime,
  type Instant,
  type IsoDate,
  type NotificationVolume,
  type SessionRow,
  type SettingsRow,
  type TodayState,
} from '@scootch/domain';
import { offlineLine, offlinePacks } from '@scootch/voice';

import type { PlannedText } from '../effects/effects-runner';

import { showsComedy } from './shows-comedy';

/** The start time assumed on a phone with no sessions to learn from. */
export const DEFAULT_USUAL_START: ClockTime = '10:00';

/** The time of day the person usually starts: the middle one of their stored session starts. */
export function usualStart(sessions: readonly SessionRow[], timeZone: string): ClockTime {
  const minutes = sessions
    .map((session) => localDateTime(instantFromIso(session.startedAt), timeZone))
    .map((local) => local.hour * 60 + local.minute)
    .sort((a, b) => a - b);
  const middle = minutes[Math.floor(minutes.length / 2)];
  if (middle === undefined) return DEFAULT_USUAL_START;
  return `${String(Math.floor(middle / 60)).padStart(2, '0')}:${String(middle % 60).padStart(2, '0')}`;
}

const OWN_VOLUME: Record<Attitude, NotificationVolume> = {
  soft: 'soft',
  cheeky: 'cheeky',
  unhinged: 'theatre',
};

export interface DayNotificationsInput {
  readonly today: TodayState;
  readonly settings: SettingsRow;
  readonly localDate: IsoDate;
  readonly timeZone: string;
  readonly lastOpenedDay: IsoDate | null;
  readonly usualStart: ClockTime;
  /** The reminder the person asked for on today's serious task, if any. */
  readonly reminderAt?: Instant | null;
}

/**
 * Today's local notifications: the task's own lines at the times the back-off plan allows. Only a
 * task that is set and not yet started is nudged; a serious task, a crisis day and a finished day
 * get none. A plan quieter than the person's attitude speaks from the offline pack's quieter voice.
 */
export function dayNotifications(input: DayNotificationsInput): PlannedText[] {
  const { today, settings } = input;
  if (today.kind === 'serious') {
    // The only thing a serious task ever sends: the reminder that was asked for, in plain words
    // that do not name the task.
    const at = input.reminderAt ?? null;
    return at === null ? [] : [{ at, text: offlinePacks[settings.language].plain.reminder }];
  }
  if (today.kind !== 'task_set' || today.task.status !== 'set') return [];
  if (!showsComedy(today.task, 'notification')) return [];
  const lines = today.task.notifications;
  if (lines.length === 0) return [];

  const plan = notificationPlan({
    attitude: settings.attitude,
    ignoredDays: ignoredDaysBefore(input.lastOpenedDay, input.localDate),
    localDate: input.localDate,
    timeZone: input.timeZone,
    quietHours: { start: settings.quietHoursStart, end: settings.quietHoursEnd },
    usualStart: input.usualStart,
    available: lines.length,
  });

  const planned: PlannedText[] = [];
  for (const one of plan.notifications) {
    const own = lines[one.ordinal]?.text;
    if (own === undefined) continue;
    const quieter = one.volume !== OWN_VOLUME[settings.attitude];
    const voice: Attitude = one.volume === 'cheeky' ? 'cheeky' : 'soft';
    planned.push({
      at: one.at,
      text: quieter ? offlineLine(settings.language, voice, 'notification', one.ordinal) : own,
    });
  }
  return planned;
}
