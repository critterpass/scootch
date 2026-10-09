import {
  getReadyLeadMinutes,
  getReadyTime,
  heardGap,
  instantOnScootchDay,
  notificationPlan,
  type Attitude,
  type DayHeardTime,
  type HeardTime,
  type Instant,
  type IsoDate,
  type SettingsRow,
  type TimedNotification,
} from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { getReadyLine } from '@scootch/voice';

import type { TaskFirstStage } from '../api/task-client';
import type { PlannedText } from '../effects/effects-runner';

import type { DayNotificationsInput } from './day-notifications';
import type { DayContext } from './day-types';

/**
 * The time the words gave for today, as the day keeps it: watched until the person says not to.
 * A time that has already gone by is not kept at all.
 */
export function heardTimeToKeep(
  heard: HeardTime | null,
  input: { readonly localDate: IsoDate; readonly timeZone: string; readonly now: Instant },
): DayHeardTime | null {
  if (heard === null) return null;
  const at = instantOnScootchDay(input.localDate, heard.at, input.timeZone);
  return at > input.now ? { at: heard.at, heardAs: heard.heardAs, watched: true } : null;
}

/**
 * A task call's answer heard a time ("dentist at 3"): the day keeps it, and the one thing is shown
 * with it said back. An answer that heard none leaves the day's time as it was, and asks nothing.
 */
export async function keepHeardTime(ctx: DayContext, first: TaskFirstStage): Promise<void> {
  const heard = 'heardTime' in first ? (first.heardTime ?? null) : null;
  const { localDate } = ctx.memory.state;
  const kept = heardTimeToKeep(heard, { localDate, timeZone: ctx.deps.timeZone(), now: ctx.now() });
  if (kept === null) return void ctx.set({ heardTimeAsked: false });
  const { days } = ctx.deps.repositories;
  const day = await days.get(localDate);
  if (!day) return;
  await days.put({ ...day, heardTime: kept });
  ctx.set({ heardTimeAsked: true });
}

/** "Good" keeps the time watched; "Don't watch it" keeps it unwatched: no capped length, no nudge. */
export async function heardTimeAnswered(ctx: DayContext, watched: boolean): Promise<void> {
  const { days } = ctx.deps.repositories;
  const day = await days.get(ctx.memory.state.localDate);
  const heard = day?.heardTime ?? null;
  if (day && heard !== null && heard.watched !== watched) {
    await days.put({ ...day, heardTime: { ...heard, watched } });
  }
  ctx.set({ heardTimeAsked: false });
  await ctx.refresh();
}

export interface HeardDay {
  readonly heardTime?: DayHeardTime | null | undefined;
  readonly settings: SettingsRow;
  readonly localDate: IsoDate;
  readonly timeZone: string;
  readonly now: Instant;
}

/**
 * The length the wheel opens at: the longest on offer that ends before getting ready, while a
 * watched time is ahead today and one fits; otherwise the length it opens at on any day. The
 * smallest ask of a morning stays as small as it was. `beforeGetReady` is true while the line
 * under the wheel says "then you get ready".
 */
export function openingLength(
  day: HeardDay,
  opens: {
    readonly usual: number;
    readonly smallest: number | null;
    readonly lengths: readonly number[];
  },
): { readonly minutes: number; readonly beforeGetReady: boolean } {
  const { usual, smallest, lengths } = opens;
  const heard = day.heardTime ?? null;
  const gap =
    heard === null
      ? null
      : heardGap({
          heardTime: heard,
          leadMinutes: getReadyLeadMinutes(day.settings),
          localDate: day.localDate,
          timeZone: day.timeZone,
          now: day.now,
          lengths,
        });
  if (gap === null || gap.longestMinutes === null) {
    return { minutes: smallest ?? usual, beforeGetReady: false };
  }
  const longest = gap.longestMinutes;
  return {
    minutes: smallest === null ? longest : Math.min(smallest, longest),
    beforeGetReady: true,
  };
}

/** Today's one nudge to get ready, for the notification plan; none once its time has come. */
export function getReadyTimed(input: Omit<HeardDay, 'now'> & { readonly now?: Instant }) {
  const heard = input.heardTime ?? null;
  if (heard === null) return [];
  const now = input.now ?? Number.NEGATIVE_INFINITY;
  const getReady = getReadyTime({
    heardTime: heard,
    leadMinutes: getReadyLeadMinutes(input.settings),
    localDate: input.localDate,
    timeZone: input.timeZone,
    now,
  });
  return getReady === null || getReady.at <= now
    ? []
    : [{ kind: 'get_ready', at: getReady.at } satisfies TimedNotification];
}

/** What the nudge says, from Scootch and never a monster: "Dentist at 3. Time to get ready." */
export function getReadyText(
  at: Instant,
  language: Language,
  heardTime: DayHeardTime | null | undefined,
): PlannedText[] {
  return heardTime ? [{ at, text: getReadyLine(language, heardTime.heardAs) }] : [];
}

/**
 * The nudge on a day whose own lines are not planned here (nothing set, a session running, a
 * serious thing): a plan of its own at the day's volume, which drops it inside quiet hours.
 */
export function getReadyAlone(input: DayNotificationsInput, attitude: Attitude): PlannedText[] {
  const timed = getReadyTimed(input);
  if (timed.length === 0) return [];
  const { settings } = input;
  const plan = notificationPlan({
    attitude,
    ignoredDays: 0,
    localDate: input.localDate,
    timeZone: input.timeZone,
    quietHours: { start: settings.quietHoursStart, end: settings.quietHoursEnd },
    usualStart: input.usualStart,
    available: 0,
    timed,
  });
  return plan.notifications
    .filter((one) => one.kind === 'get_ready')
    .flatMap((one) => getReadyText(one.at, settings.language, input.heardTime));
}
