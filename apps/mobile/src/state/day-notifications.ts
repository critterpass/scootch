import {
  addDays,
  instantFromIso,
  instantOfLocal,
  isQuietMinute,
  localDateTime,
  notificationPlan,
  type Attitude,
  type ClockTime,
  type DayHeardTime,
  type Instant,
  type IsoDate,
  type NotificationVolume,
  type SessionRow,
  type SettingsRow,
  type TodayState,
} from '@scootch/domain';
import { t } from '@scootch/i18n';
import { noTaskLine, offlineLine, offlinePacks } from '@scootch/voice';

import type { NotificationSender } from '../effects/adapters';
import type { PlannedText } from '../effects/effects-runner';

import { getReadyAlone, getReadyText, getReadyTimed } from './heard-time';
import { lineFor } from './lines';
import { showsComedy } from './shows-comedy';
import { cueTimed, cueWords } from './start-cue';

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
  /** Today's monster, which sends the task's own lines in its name. `null` before it hatched. */
  readonly monster?: NotificationSender | null;
  /** The things finished today that a receipt may list. */
  readonly doneToday?: number;
  /** The phone's clock: a cue whose time has gone by today is not planned. Unset, none has. */
  readonly now?: Instant;
  /** A time heard for today: while watched and ahead, one nudge to get ready before it. */
  readonly heardTime?: DayHeardTime | null;
}

/** When the day's receipt is sent on a finished day. */
export const RECEIPT_AT: ClockTime = '19:00';

/**
 * The evening receipt: on a day that is done, with something on it, Scootch sends the day's
 * receipt as a picture, once. It is the only thing sent that evening, so no attitude's limit is
 * passed, and it is not sent inside quiet hours.
 */
function eveningReceipt(input: DayNotificationsInput, attitude: Attitude): PlannedText[] {
  const { today, settings } = input;
  const done = input.doneToday ?? 0;
  if (today.kind !== 'done_for_today' || done < 1) return [];
  const [hour = 19, minute = 0] = RECEIPT_AT.split(':').map(Number);
  const quietHours = { start: settings.quietHoursStart, end: settings.quietHoursEnd };
  if (isQuietMinute(hour * 60 + minute, quietHours)) return [];
  const text = noTaskLine(settings.language, attitude, 'eveningReceipt');
  return [
    {
      at: instantOfLocal(input.localDate, RECEIPT_AT, input.timeZone),
      text: text.replaceAll('{count}', String(done)),
      receipt: true,
    },
  ];
}

/** The offline voice a volume is written in. Only full theatre is Unhinged. */
function voiceFor(volume: NotificationVolume): Attitude {
  if (volume === 'theatre') return 'unhinged';
  return volume === 'cheeky' ? 'cheeky' : 'soft';
}

/**
 * The end of the session that is running, so time being up is heard with the phone locked: the
 * timers inside the app do not run there. One notification at the end time, and none inside quiet
 * hours, and none for a serious task, which gets nothing but the reminder it asked for. An
 * ordinary task says it in its own time-up line; one nobody has screened, in the plain words of
 * the interface, which never name the task. It leaves the plan as soon as the session is
 * finished, left or answered "not finished", and moves with its end time.
 */
function sessionEnd(input: DayNotificationsInput): PlannedText[] {
  const { today, settings } = input;
  if (today.kind !== 'in_session') return [];
  const { session, task } = today;
  if (session.endedAt !== null || session.outcome !== null) return [];
  const at = instantFromIso(session.endsAt);
  const local = localDateTime(at, input.timeZone);
  const quietHours = { start: settings.quietHoursStart, end: settings.quietHoursEnd };
  if (isQuietMinute(local.hour * 60 + local.minute, quietHours)) return [];
  const own = showsComedy(task, 'notification') ? lineFor('timeUp', task, settings) : null;
  return [{ at, text: own ?? t(settings.language, 'session.timeUpSpoken') }];
}

/**
 * The cue of a serious thing that is still only set: one message in plain words at the soft
 * limit, signed by no monster, and a tap on it starts the thing as any cue's does.
 */
function plainCue(input: DayNotificationsInput): PlannedText[] {
  const { today, settings } = input;
  const timed = cueTimed({ ...input, now: input.now });
  const cue = 'task' in today ? (today.task.startCue ?? null) : null;
  if (today.kind !== 'serious' || timed.length === 0 || cue === null) return [];
  const plan = notificationPlan({
    attitude: 'soft',
    ignoredDays: 0,
    localDate: input.localDate,
    timeZone: input.timeZone,
    quietHours: { start: settings.quietHoursStart, end: settings.quietHoursEnd },
    usualStart: input.usualStart,
    available: 0,
    timed,
    plain: true,
  });
  return plan.notifications
    .filter((one) => one.kind === 'cue')
    .map((one) => ({
      at: one.at,
      text: cueWords(settings.language, 'plain', cue),
      taskId: today.task.id,
    }));
}

/**
 * The local notifications from today on. They are planned whenever the app is open, so being open
 * is what resets the back-off: today is always planned at full volume, with nothing said about
 * any days before it, and each later day is planned as one more day ignored. Opening the app on
 * one of those days replaces the whole plan.
 *
 * Today's are the task's own lines, and only for a task that is set and not yet started. Its
 * monster sends them, with the bites and the three actions under each; a monster turned down for
 * a week sends the soft lines of the offline pack at the soft limit instead. The later days are
 * Scootch's own and speak from the offline pack, which is never about a task. A crisis day plans nothing at
 * all, and a serious task plans only the reminder that was asked for; while a task not yet
 * screened is open, nothing louder than the soft voice is planned.
 */
export function dayNotifications(input: DayNotificationsInput): PlannedText[] {
  const { today, settings } = input;
  if (today.kind === 'crisis') return [];
  // A phone that has not been through first launch, or has just had everything deleted, has
  // nobody to nudge yet.
  if (settings.firstLaunchDoneAt === null) return [];
  if (today.kind === 'serious') {
    // While a serious task is open nothing playful is planned at all, today or ahead: the only
    // thing sent is the reminder that was asked for, in plain words that do not name the task.
    const at = input.reminderAt ?? null;
    const reminder =
      at === null ? [] : [{ at, text: offlinePacks[settings.language].plain.reminder }];
    // The nudge to get ready takes the one place a soft day has: a cue that day gives way to it.
    const nudge = getReadyAlone(input, 'soft');
    return [...reminder, ...(nudge.length > 0 ? nudge : plainCue(input))];
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
  const planned: PlannedText[] = [...sessionEnd(input), ...eveningReceipt(input, attitude)];

  const timed = [...getReadyTimed(input), ...cueTimed({ ...input, now: input.now })];
  const comedy = today.kind === 'task_set' && showsComedy(today.task, 'notification');
  if (today.kind === 'task_set' && today.task.status === 'set' && (comedy || timed.length > 0)) {
    const { task } = today;
    // A thing nobody may joke about has none of its own lines: only its cue, in plain words.
    const lines = comedy ? task.notifications : [];
    const turnedDown = task.softUntil != null && task.softUntil >= input.localDate;
    const plan = notificationPlan({
      ...shared,
      ...(turnedDown ? { attitude: 'soft' as const } : {}),
      ignoredDays: 0,
      localDate: input.localDate,
      available: lines.length,
      timed,
      plain: !comedy,
    });
    // A monster's message carries its bites and the three actions. Before it has hatched the
    // same lines are Scootch's, with nothing under them. The cue's message is the start button
    // itself: a tap on it starts the thing, so nothing sits under it.
    const sender = input.monster
      ? { from: input.monster, taskId: task.id, actions: true }
      : { taskId: task.id };
    const cue = task.startCue ?? null;
    for (const one of plan.notifications) {
      // The nudge to get ready is Scootch's own, with nothing under it.
      if (one.kind === 'get_ready') {
        planned.push(...getReadyText(one.at, settings.language, input.heardTime));
        continue;
      }
      if (one.kind === 'cue' && cue !== null) {
        const voice = one.plain ? 'plain' : turnedDown ? 'soft' : attitude;
        const from = one.plain || !input.monster ? {} : { from: input.monster };
        const text = cueWords(settings.language, voice, cue);
        planned.push({ at: one.at, text, taskId: task.id, ...from });
        continue;
      }
      const text = turnedDown
        ? offlineLine(settings.language, 'soft', 'notification', one.ordinal)
        : lines[one.ordinal]?.text;
      if (text !== undefined) planned.push({ at: one.at, text, ...sender });
    }
  } else {
    planned.push(...getReadyAlone(input, attitude));
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
