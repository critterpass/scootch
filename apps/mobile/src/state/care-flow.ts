import {
  HOUR_MS,
  MINUTE_MS,
  isQuietMinute,
  isoFromInstant,
  localDateTime,
  type Instant,
  type QuietHours,
} from '@scootch/domain';

import { careGate } from '../api/care-gate';
import type { SessionContext } from '../effects/adapters';

import type { DayContext, DayEvent } from './day-types';
import { NO_AFTER_LINES, lineFor } from './lines';
import { park } from './task-rows';

/** A reminder is never set for sooner than this. */
const REMINDER_LEAD_MS = 15 * MINUTE_MS;

const NOTHING_SAID: SessionContext = { title: '', liveLine: '', lineFor: () => null };

/**
 * A crisis day begins: every task is hidden, and anything that was going on stops without a word.
 * A running session ends with its timers, its Live Activity and its notifications; nothing is
 * granted and nothing is said. The words that caused it are written nowhere.
 */
export async function enterCrisis(ctx: DayContext): Promise<void> {
  const { days } = ctx.deps.repositories;
  const day = await days.get(ctx.memory.state.localDate);
  if (day) await days.put({ ...day, status: 'crisis' });
  // Words kept for the model to sort may be the ones that caused it: none of them stay.
  await ctx.deps.repositories.unsortedWords.clear();
  await stopWithoutAWord(ctx);
}

/**
 * Whatever was going on for a text stops, and nothing is said: its kept words go, a running
 * session ends with its timers, its Live Activity and its notifications, and nothing is granted.
 * A crisis and a rejected text both end this way.
 */
export async function stopWithoutAWord(ctx: DayContext): Promise<void> {
  const { transcripts, sessions, careReminder } = ctx.deps.repositories;
  const transcriptId = ctx.memory.offer?.transcriptId;
  if (transcriptId) await transcripts.remove(transcriptId);
  ctx.memory.offer = null;

  const row = ctx.memory.sessionRowId ? await sessions.get(ctx.memory.sessionRowId) : null;
  if (row && row.endedAt === null) {
    await sessions.put({ ...row, endedAt: isoFromInstant(ctx.now()), outcome: 'left_early' });
  }
  ctx.memory.sessionRowId = null;
  ctx.memory.restPending = false;
  ctx.memory.stopWaiting?.();
  ctx.memory.stopWaiting = null;
  ctx.deps.runner.run(
    [
      { kind: 'cancel_timer' },
      { kind: 'stop_cue', cue: 'hold-rising' },
      { kind: 'end_live_activity' },
    ],
    NOTHING_SAID,
  );
  await careReminder.clear();
  ctx.set({
    pick: { kind: 'none' },
    session: null,
    line: null,
    burst: null,
    treat: null,
    parkedThoughts: [],
    afterLines: NO_AFTER_LINES,
    heardDeadlines: [],
    notice: null,
    taskCall: 'idle',
    returnedText: null,
    modelDown: false,
    reminderAt: null,
  });
}

/** The words a person typed into an event, wherever the app lets them type. */
function typedWords(event: DayEvent): string | null {
  if (event.type === 'excuse_given') return event.text;
  if (event.type === 'session_set' || event.type === 'deal_struck') return event.treat ?? null;
  if (event.type === 'session' && event.event.type === 'thought_parked') return event.event.text;
  return null;
}

/**
 * An explicit phrase typed anywhere (an excuse, a treat, a thought parked mid-session) is a crisis
 * at once, exactly as it is in a ramble. True when the event was taken over by the crisis.
 */
export async function crisisInWords(ctx: DayContext, event: DayEvent): Promise<boolean> {
  const words = typedWords(event);
  if (words === null || careGate(words) !== 'crisis') return false;
  await enterCrisis(ctx);
  await ctx.refresh();
  return true;
}

/**
 * The next whole hour that is at least a quarter of an hour away, or `null` when that falls in
 * the person's quiet hours: no reminder is offered then.
 */
export function reminderTime(now: Instant, timeZone: string, quiet: QuietHours): Instant | null {
  const earliest = now + REMINDER_LEAD_MS;
  const local = localDateTime(earliest, timeZone);
  const pastTheHour = local.minute * MINUTE_MS + (earliest % MINUTE_MS);
  const at = pastTheHour === 0 ? earliest : earliest - pastTheHour + HOUR_MS;
  const hour = localDateTime(at, timeZone).hour;
  return isQuietMinute(hour * 60, quiet) ? null : at;
}

/** "Remind me at …" on a serious task: one plain notification, asked for and never repeated. */
export async function askReminder(ctx: DayContext): Promise<void> {
  const { today, settings } = ctx.memory.state;
  if (today.kind !== 'serious' || today.task.status !== 'set') return;
  const at = reminderTime(ctx.now(), ctx.deps.timeZone(), {
    start: settings.quietHoursStart,
    end: settings.quietHoursEnd,
  });
  if (at === null) return;
  await ctx.deps.repositories.careReminder.write({ taskId: today.task.id, at });
  await ctx.refresh();
}

/**
 * "Not today" on a serious task: it waits in the drawer with its flag, the day is over, and the
 * only thing said is the task's own plain line for leaving it.
 */
export async function setSeriousAside(ctx: DayContext): Promise<void> {
  const { today, settings, localDate } = ctx.memory.state;
  if (today.kind !== 'serious' || today.task.status !== 'set') return;
  const { task } = today;
  const { repositories } = ctx.deps;
  await park(ctx, [{ text: task.originalText, dueDate: task.dueDate }], task.screen);
  await repositories.forgetTask(task.id);
  await repositories.careReminder.clear();
  const day = await repositories.days.get(localDate);
  if (day && day.status === 'open') await repositories.days.put({ ...day, status: 'done' });
  const said = lineFor('notFinished', task, settings);
  ctx.set({
    pick: { kind: 'none' },
    heardDeadlines: [],
    line: said === null ? null : { slot: 'notFinished', text: said },
  });
  await ctx.refresh();
}
