import { z } from 'zod';

import {
  dayNotificationSchema,
  heardTimeSchema,
  inTheWaySchema,
  seriousLinePackSchema,
  sessionLinePackSchema,
  signedWordsSchema,
} from './ai-task-call';
import { cardFinishSchema, cardRaritySchema, monsterSpecSchema, workModeSchema } from './art';
import {
  attitudeSchema,
  clockTimeSchema,
  energySchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  isoWeekSchema,
  languageSchema,
  taskTextSchema,
  type ClockTime,
} from './common';

/**
 * The phone's local tables. The phone is the source of truth.
 *
 * Each schema is one row as the app reads it. Column names are the snake_case
 * of the field names; booleans are stored as 0 or 1 and objects as JSON text.
 * Days are the user's local days (`YYYY-MM-DD`) and roll over at the local
 * morning, not at midnight UTC. Instants are ISO date-times with an offset.
 *
 * "Derived" marks a field worked out from other rows by code in the domain
 * package. A derived field is stored so screens and widgets can read it
 * without the rule, and it is rewritten whenever its inputs change.
 */
export const LOCAL_TABLES = [
  'days',
  'tasks',
  'drawer_items',
  'monsters',
  'sessions',
  'parked_thoughts',
  'world_pieces',
  'record_bars',
  'week_records',
  'settings',
] as const;
export type LocalTable = (typeof LOCAL_TABLES)[number];

/** `unscreened` is a task typed with no connection: plain company until it is screened. */
export const taskScreenSchema = z.enum(['unscreened', 'pass', 'serious']);
export type TaskScreen = z.infer<typeof taskScreenSchema>;

/** The guess sheet's five steps, in minutes: 30 min, 1 hour, 2 hours, 3 hours and half a day. */
export const GUESS_MINUTES = [30, 60, 120, 180, 360] as const;
export const guessMinutesSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(120),
  z.literal(180),
  z.literal(360),
]);
export type GuessMinutes = z.infer<typeof guessMinutesSchema>;

/** The moments of a day a thing can be brought back after (or, for bed, before). */
export const DAY_MOMENTS = ['coffee', 'lunch', 'work', 'dinner', 'bed'] as const;
export const dayMomentSchema = z.enum(DAY_MOMENTS);
export type DayMoment = z.infer<typeof dayMomentSchema>;

/**
 * When a set thing is brought back: at one of the day's moments, whose clock time is in the
 * settings, or at a clock time the user picked. A task with none starts now.
 */
export const startCueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('moment'), moment: dayMomentSchema }),
  z.object({ kind: z.literal('time'), at: clockTimeSchema }),
]);
export type StartCue = z.infer<typeof startCueSchema>;

/**
 * The line the user left on "not finished" for the sitting after: their own words, shown back
 * word for word, with the local day they were written on.
 */
export const nextStartSchema = z.object({
  text: taskTextSchema,
  writtenOn: isoDateSchema,
});
export type NextStart = z.infer<typeof nextStartSchema>;

/**
 * A time heard for the day. `watched` is false after "Don't watch it": the time is kept, and no
 * length is capped by it and no nudge is sent for it.
 */
export const dayHeardTimeSchema = heardTimeSchema.extend({ watched: z.boolean() });
export type DayHeardTime = z.infer<typeof dayHeardTimeSchema>;

/** The word an odd hatch adds to a card's name. */
export const oddWordSchema = z.enum(['tiny']);
export type OddWord = z.infer<typeof oddWordSchema>;

export const dayRowSchema = z.object({
  /** Primary key. */
  localDate: isoDateSchema,
  /**
   * `crisis` hides every task until the care screen is closed or the day ends; `quiet` is a day
   * whose care screen was closed, in plain company until the next thing is typed; `done` is
   * "Done for today".
   */
  status: z.enum(['open', 'done', 'crisis', 'quiet']),
  openedAt: isoDateTimeSchema,
  morningLine: z.string().nullable(),
  energy: energySchema.nullable(),
  /** A clock time the user said for this day. Null or absent on a day with none. */
  heardTime: dayHeardTimeSchema.nullable().optional(),
});
export type DayRow = z.infer<typeof dayRowSchema>;

/**
 * The session pack as a task keeps it. `cueNotification` is the message for the moment the user
 * asked to be brought back at, as the task call wrote it, opening with `cuePlaceholder`. Null or
 * absent when the answer carried none, and on a pack stored before it existed.
 */
export const storedSessionLinesSchema = sessionLinePackSchema.extend({
  cueNotification: dayNotificationSchema.nullable().optional(),
});
export type StoredSessionLines = z.infer<typeof storedSessionLinesSchema>;

/**
 * One thing for one day. Letting a task go deletes its row, its monster and
 * its sessions: it leaves no trace. A crisis text is never stored as a task.
 */
export const taskRowSchema = z.object({
  id: idSchema,
  /** The day it is the one thing. "Carry on tomorrow" moves it to the next day. */
  localDate: isoDateSchema,
  /** The current ask, after any shrinking or bargaining. */
  text: taskTextSchema,
  /** The ask as first set. `text` only ever gets smaller than this. */
  originalText: taskTextSchema,
  source: z.enum(['ramble', 'typed', 'drawer', 'haunt', 'web']),
  /** The care flag. Screens check it; nothing re-derives it. */
  screen: taskScreenSchema,
  /** True after "it's fine, be funny" on a serious task. */
  seriousOverridden: z.boolean(),
  status: z.enum(['set', 'started', 'finished']),
  carriedOver: z.boolean(),
  /** The first day the user mentioned it, kept from the drawer when swapped in. */
  firstMentionedOn: isoDateSchema,
  dueDate: isoDateSchema.nullable(),
  workMode: workModeSchema.nullable(),
  fitsTenMinutes: z.boolean().nullable(),
  sharePrivate: z.boolean().nullable(),
  shrinkCount: z.number().int().min(0),
  /** The stored result of the task call; `null` until it has run. */
  lines: z.union([storedSessionLinesSchema, seriousLinePackSchema]).nullable(),
  notifications: z.array(dayNotificationSchema),
  /**
   * Which of the three bites in `lines` have been ticked, by their place (0 to 2). Null or absent
   * on a task nobody has bitten and on one stored before bites existed.
   */
  bitesCaught: z.array(z.number().int().min(0).max(2)).max(3).nullable().optional(),
  /**
   * The last day this thing's monster sends its messages at Soft, after "Turn it down for a
   * week". Null or absent on a task nobody turned down.
   */
  softUntil: isoDateSchema.nullable().optional(),
  /**
   * How long the user thought it would take, asked before the start. Null or absent when no guess
   * was made. It is printed beside the real time and never compared with it.
   */
  guessMinutes: guessMinutesSchema.nullable().optional(),
  /** When the thing is brought back. Null or absent means now. */
  startCue: startCueSchema.nullable().optional(),
  /** The answer to "Anything in the way?". Null or absent when skipped or never asked. */
  inTheWay: inTheWaySchema.nullable().optional(),
  /**
   * The line left for the next sitting, which is that sitting's first bite. Cleared at the catch
   * and when the task is made smaller; gone with the row when the task is let go.
   */
  nextStart: nextStartSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
});
export type TaskRow = z.infer<typeof taskRowSchema>;

/** A parked thing. Opened only by a deliberate pull; a faded item is deleted. */
export const drawerItemRowSchema = z.object({
  id: idSchema,
  text: taskTextSchema,
  screen: taskScreenSchema,
  dueDate: isoDateSchema.nullable(),
  firstMentionedOn: isoDateSchema,
  /** Mentioning it in a new ramble moves this forward and resets the fade. */
  lastMentionedOn: isoDateSchema,
  /** Derived from `dueDate`: the day it returns as the one thing. `null` when undated. */
  returnOn: isoDateSchema.nullable(),
  /** Derived from `lastMentionedOn`: two weeks on, for undated items. `null` when dated. */
  fadesOn: isoDateSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type DrawerItemRow = z.infer<typeof drawerItemRowSchema>;

/**
 * A task's monster. The card fields are `null` until it is caught, then
 * frozen: a card never changes after the catch, apart from its finish.
 */
export const monsterRowSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  origin: z.enum(['task', 'web', 'haunt']),
  /** `spec.size` drops with each shrink. */
  spec: monsterSpecSchema,
  name: z.string().min(1).max(60),
  title: z.string().min(1).max(40),
  flavourText: z.string().min(1).max(160),
  /**
   * The server's signature over the three words above, kept as it came. Null or absent on a
   * monster the phone named itself and on one hatched before words were signed: its picture can
   * still be shared, but no public page is made for it.
   */
  signed: signedWordsSchema.nullable().optional(),
  hatchedAt: isoDateTimeSchema,
  caughtAt: isoDateTimeSchema.nullable(),
  /** Derived at the catch: the user's local day of `caughtAt`. */
  caughtOn: isoDateSchema.nullable(),
  /** Derived at the catch: the catch order in the collection. */
  number: z.number().int().min(1).nullable(),
  /** Derived at the catch from the task (how long it lurked, how it was caught). */
  rarity: cardRaritySchema.nullable(),
  /** Derived at the catch: days from the task's `firstMentionedOn` to `caughtOn`. */
  daysLurked: z.number().int().min(0).nullable(),
  /** Derived at the catch: the task's session minutes, rounded up. */
  catchMinutes: z.number().int().min(1).nullable(),
  /** Derived at the catch from days lurked and shrink count, 1 to 5. */
  dread: z.number().int().min(1).max(5).nullable(),
  /** Frozen at the catch: the task's guess. Null or absent when none was made. */
  guessMinutes: guessMinutesSchema.nullable().optional(),
  /** Frozen at the catch: the word an odd hatch added to the name. Null or absent on the rest. */
  oddWord: oddWordSchema.nullable().optional(),
  finish: cardFinishSchema,
});
export type MonsterRow = z.infer<typeof monsterRowSchema>;

export const finishMethodSchema = z.enum(['hold', 'double_tap', 'voice', 'tap']);
export type FinishMethod = z.infer<typeof finishMethodSchema>;

/** One sitting. A row with `endedAt: null` is the running session, and survives a kill and relaunch. */
export const sessionRowSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  localDate: isoDateSchema,
  /** As long as the wheel goes: three hours. */
  plannedMinutes: z.number().int().min(1).max(180),
  /** The treat the user named before starting. */
  treat: z.string().max(80).nullable(),
  startedAt: isoDateTimeSchema,
  /** Derived: `startedAt` plus `plannedMinutes`. The timer reads this, never a ticking count. */
  endsAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.nullable(),
  /** `left_early` is unremarked and offers nothing. */
  outcome: z.enum(['finished', 'not_finished', 'left_early']).nullable(),
  /** Every method reaches the same reward. `tap` is the plain finish of a serious task. */
  finishMethod: finishMethodSchema.nullable(),
  notFinishedChoice: z.enum(['carry_on', 'make_smaller', 'let_go']).nullable(),
  /** Set when the session ran at a table. */
  tableId: idSchema.nullable(),
});
export type SessionRow = z.infer<typeof sessionRowSchema>;

/** Hidden all session, shown after the finish with keep or discard. */
export const parkedThoughtRowSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  text: taskTextSchema,
  parkedAt: isoDateTimeSchema,
  /** `keep` copies it into the drawer; `discard` lets it go. `null` until the user chooses. */
  resolution: z.enum(['keep', 'discard']).nullable(),
});
export type ParkedThoughtRow = z.infer<typeof parkedThoughtRowSchema>;

/** One permanent piece per finished thing. Rows are only ever added. */
export const worldPieceRowSchema = z.object({
  id: idSchema,
  /** `monster` is a caught monster's home; `plain` is the quiet piece a serious task leaves. */
  kind: z.enum(['monster', 'plain']),
  monsterId: idSchema.nullable(),
  /** Where it landed, 0 to 1 across and down the world. It never moves. */
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  seed: z.string().min(1).max(64),
  addedOn: isoDateSchema,
});
export type WorldPieceRow = z.infer<typeof worldPieceRowSchema>;

export const recordInstrumentSchema = z.enum([
  'keys',
  'bassline',
  'marimba',
  'drums',
  'whistle',
  'bells',
  'choir',
]);

/** One bar per finished day. A week with fewer bars is a smaller band. */
export const recordBarRowSchema = z.object({
  /** Primary key: one bar a day. */
  localDate: isoDateSchema,
  /** Derived from `localDate`. */
  week: isoWeekSchema,
  /** Derived: this bar's place in its week, 1 to 7, which fixes the instrument. */
  position: z.number().int().min(1).max(7),
  /** Derived from `position`. */
  instrument: recordInstrumentSchema,
  /** Seeds the bar's music: the day's monster seed, or the date for a serious day. */
  seed: z.string().min(1).max(64),
  monsterId: idSchema.nullable(),
});
export type RecordBarRow = z.infer<typeof recordBarRowSchema>;

/** The week's written parts: the record's name and the weekly sentence. */
export const weekRecordRowSchema = z.object({
  /** Primary key. */
  week: isoWeekSchema,
  name: z.string().max(60).nullable(),
  linerNote: z.string().nullable(),
  sentence: z.string().nullable(),
});
export type WeekRecordRow = z.infer<typeof weekRecordRowSchema>;

/** A single row. Plus, system permissions and the notification back-off are not stored here. */
export const settingsRowSchema = z.object({
  id: z.literal('settings'),
  attitude: attitudeSchema,
  language: languageSchema,
  music: z.boolean(),
  effects: z.boolean(),
  haptics: z.boolean(),
  /** `calm` is the app's own switch; the system's Reduce Motion always wins. */
  motion: z.enum(['full', 'calm']),
  quietHoursStart: clockTimeSchema,
  quietHoursEnd: clockTimeSchema,
  /**
   * Who a session opens on: the task's monster and its rolled catch, or Scootch at work with the
   * hold to finish. Either is one tap from the other while the session runs.
   */
  catchWith: z.enum(['rolled', 'hold']),
  /** Keep a ramble's transcript for seven days instead of dropping it once the one thing is picked. */
  keepTranscripts: z.boolean(),
  canBeHaunted: z.boolean(),
  hideTableLabel: z.boolean(),
  /** The "Your world" card on home. Swiped away, it stays away. */
  worldCardOnHome: z.boolean(),
  /** What the app icon changes with: the attitude, the worn card finish, or nothing at all. */
  iconFollows: z.enum(['attitude', 'finish', 'pinned']),
  /** The icon that stays when the icon follows nothing (apps/mobile/src/features/look/icons.ts). */
  iconPinned: z.string().min(1).max(24),
  /** The wallpaper last looked at, which the Shortcuts action draws each morning. */
  wallpaper: z.enum(['world', 'perched', 'night']),
  firstLaunchDoneAt: isoDateTimeSchema.nullable(),
  /**
   * The clock time of each day moment. They are fixed until the user changes them; nothing here
   * is learned. Null or absent reads as `DEFAULT_DAY_MOMENT_TIMES`.
   */
  coffeeAt: clockTimeSchema.nullable().optional(),
  lunchAt: clockTimeSchema.nullable().optional(),
  workAt: clockTimeSchema.nullable().optional(),
  dinnerAt: clockTimeSchema.nullable().optional(),
  bedAt: clockTimeSchema.nullable().optional(),
  /**
   * Minutes before a heard time at which getting ready starts. Null or absent reads as
   * `DEFAULT_GET_READY_LEAD_MINUTES`.
   */
  getReadyLeadMinutes: z.number().int().min(5).max(180).nullable().optional(),
  /** The count of others in a session, in the session's footer. Null or absent is on. */
  othersHunting: z.boolean().nullable().optional(),
});
export type SettingsRow = z.infer<typeof settingsRowSchema>;

/** Where each day moment sits on the clock until the user moves it. */
export const DEFAULT_DAY_MOMENT_TIMES: Readonly<Record<DayMoment, ClockTime>> = {
  coffee: '09:00',
  lunch: '13:10',
  work: '17:30',
  dinner: '19:30',
  bed: '20:30',
};
export const DEFAULT_GET_READY_LEAD_MINUTES = 35;

type HelperSettings = Pick<
  SettingsRow,
  'coffeeAt' | 'lunchAt' | 'workAt' | 'dinnerAt' | 'bedAt' | 'getReadyLeadMinutes' | 'othersHunting'
>;

/** The clock time of every day moment: the user's own where one is stored, else the default. */
export function dayMomentTimes(settings: HelperSettings): Record<DayMoment, ClockTime> {
  return {
    coffee: settings.coffeeAt ?? DEFAULT_DAY_MOMENT_TIMES.coffee,
    lunch: settings.lunchAt ?? DEFAULT_DAY_MOMENT_TIMES.lunch,
    work: settings.workAt ?? DEFAULT_DAY_MOMENT_TIMES.work,
    dinner: settings.dinnerAt ?? DEFAULT_DAY_MOMENT_TIMES.dinner,
    bed: settings.bedAt ?? DEFAULT_DAY_MOMENT_TIMES.bed,
  };
}

export function getReadyLeadMinutes(settings: HelperSettings): number {
  return settings.getReadyLeadMinutes ?? DEFAULT_GET_READY_LEAD_MINUTES;
}

export function showsOthersHunting(settings: HelperSettings): boolean {
  return settings.othersHunting ?? true;
}
