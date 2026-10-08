import { z } from 'zod';

import {
  seriousLinePackSchema,
  sessionLinePackSchema,
  signedWordsSchema,
  dayNotificationSchema,
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

export const dayRowSchema = z.object({
  /** Primary key. */
  localDate: isoDateSchema,
  /** `crisis` hides every task for the day; `done` is "Done for today". */
  status: z.enum(['open', 'done', 'crisis']),
  openedAt: isoDateTimeSchema,
  morningLine: z.string().nullable(),
  energy: energySchema.nullable(),
});
export type DayRow = z.infer<typeof dayRowSchema>;

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
  lines: z.union([sessionLinePackSchema, seriousLinePackSchema]).nullable(),
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
  finishWith: z.enum(['hold', 'double_tap', 'voice']),
  /** Keep a ramble's transcript for seven days instead of dropping it once the one thing is picked. */
  keepTranscripts: z.boolean(),
  canBeHaunted: z.boolean(),
  hideTableLabel: z.boolean(),
  /** What the app icon changes with: the attitude, the worn card finish, or nothing at all. */
  iconFollows: z.enum(['attitude', 'finish', 'pinned']),
  /** The icon that stays when the icon follows nothing (apps/mobile/src/features/look/icons.ts). */
  iconPinned: z.string().min(1).max(24),
  firstLaunchDoneAt: isoDateTimeSchema.nullable(),
});
export type SettingsRow = z.infer<typeof settingsRowSchema>;
