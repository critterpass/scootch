import {
  addDays,
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

/** How many days after today are planned ahead, in case the app is not opened again. */
export const PLAN_AHEAD_DAYS = 14;

export interface DayNotificationsInput {
  readonly today: TodayState;
  readonly settings: SettingsRow;
  readonly localDate: IsoDate;
  readonly timeZone: string;
  readonly usualStart: ClockTime;
  /** True when a serious task is part of today or waits in the drawer: the days ahead stay soft. */
  readonly heavyToday?: boolean;
  /** The reminder the person asked for on today's serious task, if any. */
  readonly reminderAt?: Instant | null;
}

/** The offline voice a volume is written in. Only full theatre is Unhinged. */
function voiceFor(volume: NotificationVolume): Attitude {
  if (volume === 'theatre') return 'unhinged';
  return volume === 'cheeky' ? 'cheeky' : 'soft';
}

/**
 * The local notifications from today on. They are planned whenever the app is open, so being open
 * is what resets the back-off: today is always planned at full volume, with nothing said about
 * any days before it, and each later day is planned as one more day ignored. Opening the app on
 * one of those days replaces the whole plan.
 *
 * Today's are the task's own lines, and only for a task that is set and not yet started. The later
 * days speak from the offline pack, which is never about a task. A crisis day plans nothing at
 * all, and a serious task plans only the reminder that was asked for; while a task not yet
 * screened is open, nothing louder than the soft voice is planned.
 */
export function dayNotifications(input: DayNotificationsInput): PlannedText[] {
  const { today, settings } = input;
  if (today.kind === 'crisis') return [];
  if (today.kind === 'serious') {
    // While a serious task is open nothing playful is planned at all, today or ahead: the only
    // thing sent is the reminder that was asked for, in plain words that do not name the task.
    const at = input.reminderAt ?? null;
    return at === null ? [] : [{ at, text: offlinePacks[settings.language].plain.reminder }];
  }
  // Quiet after a serious task today, and for a task nobody has screened yet.
  const quiet =
    input.heavyToday === true || ('task' in today && today.task.screen === 'unscreened');
  const attitude: Attitude = quiet ? 'soft' : settings.attitude;
  const shared = {
    attitude,
    timeZone: input.timeZone,
    quietHours: { start: settings.quietHoursStart, end: settings.quietHoursEnd },
    usualStart: input.usualStart,
  };
  const planned: PlannedText[] = [];

  if (
    today.kind === 'task_set' &&
    today.task.status === 'set' &&
    showsComedy(today.task, 'notification')
  ) {
    const lines = today.task.notifications;
    const plan = notificationPlan({
      ...shared,
      ignoredDays: 0,
      localDate: input.localDate,
      available: lines.length,
    });
    for (const one of plan.notifications) {
      const text = lines[one.ordinal]?.text;
      if (text !== undefined) planned.push({ at: one.at, text });
    }
  }

  for (let ahead = 1; ahead <= PLAN_AHEAD_DAYS; ahead += 1) {
    const plan = notificationPlan({
      ...shared,
      ignoredDays: ahead - 1,
      localDate: addDays(input.localDate, ahead),
    });
    for (const one of plan.notifications) {
      const voice = quiet ? 'soft' : voiceFor(one.volume);
      planned.push({
        at: one.at,
        text: offlineLine(settings.language, voice, 'notification', one.ordinal + ahead),
      });
    }
  }
  return planned;
}
