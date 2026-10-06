import {
  addDays,
  instantFromIso,
  localDateTime,
  notificationPlan,
  type Attitude,
  type ClockTime,
  type IsoDate,
  type NotificationVolume,
  type SessionRow,
  type SettingsRow,
  type TodayState,
} from '@scootch/domain';
import { offlineLine } from '@scootch/voice';

import type { PlannedText } from '../effects/effects-runner';

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
 * all; while a serious task, or one not yet screened, is open, nothing louder than the soft voice
 * is planned.
 */
export function dayNotifications(input: DayNotificationsInput): PlannedText[] {
  const { today, settings } = input;
  if (today.kind === 'crisis') return [];
  // Quiet for a serious task, and for one nobody has screened yet: no joke before the screen.
  const quiet = today.kind === 'serious' || ('task' in today && today.task.screen === 'unscreened');
  const attitude: Attitude = quiet ? 'soft' : settings.attitude;
  const shared = {
    attitude,
    timeZone: input.timeZone,
    quietHours: { start: settings.quietHoursStart, end: settings.quietHoursEnd },
    usualStart: input.usualStart,
  };
  const planned: PlannedText[] = [];

  if (today.kind === 'task_set' && today.task.status === 'set') {
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
